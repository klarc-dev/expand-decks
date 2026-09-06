import { describe, expect, it, vi } from 'vitest';

import { retrieveKnowledgeEvidence } from '../knowledgeRetrieval';
import { evaluateRetrieval, type RetrievalCase } from '../retrievalEval';

const cases: RetrievalCase[] = [
  { id: 'exact', query: 'budget', expectedChunkIds: ['c-2'] },
  { id: 'semantic', query: 'durée du pilote', expectedChunkIds: ['c-9', 'c-10'] },
];

describe('retrieval evaluation runner', () => {
  it('reports recall, MRR and precision per case and in aggregate', async () => {
    const report = await evaluateRetrieval({
      strategy: 'baseline',
      cases,
      retrieve: async (testCase) =>
        testCase.id === 'exact' ? ['c-1', 'c-2'] : ['c-3', 'c-4', 'c-5'],
    });

    expect(report.strategy).toBe('baseline');
    expect(report.cases).toHaveLength(2);
    expect(report.cases[0]).toMatchObject({ id: 'exact', recall: 1, reciprocalRank: 0.5 });
    expect(report.cases[1]).toMatchObject({ id: 'semantic', recall: 0, reciprocalRank: 0 });
    expect(report.recall).toBeCloseTo(0.5);
    expect(report.mrr).toBeCloseTo(0.25);
    expect(report.contextPrecision).toBeCloseTo(0.25);
  });

  it('ranks graded relevance with nDCG so ordering quality is measurable', async () => {
    const graded: RetrievalCase[] = [
      { id: 'graded', query: 'pilote', expectedChunkIds: ['c-1', 'c-2'] },
    ];

    const ideal = await evaluateRetrieval({
      strategy: 'ideal',
      cases: graded,
      retrieve: async () => ['c-1', 'c-2', 'c-9'],
    });
    const inverted = await evaluateRetrieval({
      strategy: 'inverted',
      cases: graded,
      retrieve: async () => ['c-9', 'c-1', 'c-2'],
    });

    expect(ideal.ndcg).toBe(1);
    expect(inverted.ndcg).toBeLessThan(1);
    expect(inverted.ndcg).toBeGreaterThan(0);
  });

  it('reports duplicate rate and document diversity of the returned set', async () => {
    const report = await evaluateRetrieval({
      strategy: 'diversity',
      cases: [{ id: 'one', query: 'q', expectedChunkIds: ['a-1'] }],
      retrieve: async () => ['a-1', 'a-1', 'a-2', 'b-1'],
      documentOf: (chunkId) => chunkId.split('-')[0]!,
    });

    // One of four returned chunks is a repeat.
    expect(report.duplicateRate).toBeCloseTo(0.25);
    // Two distinct documents across four returned chunks.
    expect(report.documentDiversity).toBeCloseTo(0.5);
  });

  it('measures no-answer precision so unanswerable questions stay unanswered', async () => {
    const report = await evaluateRetrieval({
      strategy: 'abstain',
      cases: [
        { id: 'answerable', query: 'budget', expectedChunkIds: ['c-1'] },
        { id: 'unanswerable', query: 'météo', expectedChunkIds: [] },
        { id: 'also-unanswerable', query: 'recette', expectedChunkIds: [] },
      ],
      retrieve: async (testCase) => {
        if (testCase.id === 'answerable') return ['c-1'];
        // Correctly abstains on one unanswerable question, wrongly answers the other.
        return testCase.id === 'unanswerable' ? [] : ['c-7'];
      },
    });

    // Of the two no-answer cases, only one correctly returned nothing.
    expect(report.noAnswerPrecision).toBeCloseTo(0.5);
  });

  it('scores the hybrid retrieval strategy above the previous overlap-only ranking', async () => {
    const corpus = [
      { chunkId: 'c-1', score: 0.86, text: 'Le budget global du programme reste stable.' },
      { chunkId: 'c-2', score: 0.72, text: 'Le budget du pilote est de 90 000 EUR en 2026.' },
    ];
    const dataset: RetrievalCase[] = [
      { id: 'exact-amount', query: 'budget 90 000 EUR 2026', expectedChunkIds: ['c-2'] },
    ];

    const legacy = await evaluateRetrieval({
      strategy: 'legacy-vector-overlap',
      cases: dataset,
      retrieve: async () => [...corpus].sort((a, b) => b.score - a.score).map((c) => c.chunkId),
    });

    const hybrid = await evaluateRetrieval({
      strategy: 'hybrid-lexical',
      cases: dataset,
      retrieve: async (testCase) => {
        const items = await retrieveKnowledgeEvidence({
          source: { knowledgeBaseId: 42, indexName: 'knowledge_42' },
          query: testCase.query,
          topK: 2,
          deps: {
            embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
            vectorStore: {
              query: vi.fn().mockResolvedValue(
                corpus.map((chunk) => ({
                  id: chunk.chunkId,
                  score: chunk.score,
                  metadata: {
                    knowledgeBaseId: '42',
                    documentId: chunk.chunkId,
                    title: 'Doc',
                    chunkIndex: 0,
                    chunkId: chunk.chunkId,
                    text: chunk.text,
                  },
                })),
              ),
            },
          },
        });
        return items.map((item) => item.chunkId);
      },
    });

    expect(legacy.mrr).toBeCloseTo(0.5);
    expect(hybrid.mrr).toBe(1);
    expect(hybrid.mrr).toBeGreaterThan(legacy.mrr);
  });
});
