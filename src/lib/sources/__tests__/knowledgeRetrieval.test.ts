import { describe, expect, it, vi } from 'vitest';

import {
  KNOWLEDGE_RANKING,
  retrieveKnowledgeEvidence,
  type KnowledgeRetrievalSource,
} from '../knowledgeRetrieval';

const source: KnowledgeRetrievalSource = {
  knowledgeBaseId: 42,
  indexName: 'knowledge_42',
};

function hit(
  id: string,
  score: number,
  metadata: Record<string, unknown>,
): { id: string; score: number; metadata: Record<string, unknown> } {
  return {
    id,
    score,
    metadata: {
      knowledgeBaseId: '42',
      documentId: '9',
      title: 'Contrat cadre',
      chunkIndex: 0,
      chunkId: id,
      text: 'texte',
      ...metadata,
    },
  };
}

function deps(hits: ReturnType<typeof hit>[][]) {
  const queue = [...hits];
  const query = vi.fn().mockImplementation(async () => queue.shift() ?? []);
  return {
    query,
    deps: {
      vectorStore: { query },
      embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
    },
  };
}

describe('knowledge retrieval contract', () => {
  it('passes an explicit calibration floor to the vector store without changing production defaults', async () => {
    const { query, deps: dependencies } = deps([[]]);

    await retrieveKnowledgeEvidence({
      source,
      query: 'unsupported question',
      minScore: 0.72,
      deps: dependencies,
    });

    expect(query).toHaveBeenCalledWith(expect.objectContaining({ minScore: 0.72 }));
  });

  it('bounds and deduplicates query expansion while preserving server-owned filters', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const embedQuery = vi.fn().mockResolvedValue(Array(384).fill(0.1));
    await retrieveKnowledgeEvidence({
      source,
      query: 'original',
      deps: {
        vectorStore: { query },
        embedQuery,
        expandQuery: vi
          .fn()
          .mockResolvedValue([' original ', 'alias one', 'alias two', 'ignored fourth']),
      },
    });

    expect(embedQuery.mock.calls.map(([value]) => value)).toEqual([
      'original',
      'alias one',
      'alias two',
    ]);
    expect(query).toHaveBeenCalledTimes(3);
    for (const [call] of query.mock.calls) {
      expect(call).toMatchObject({
        indexName: 'knowledge_42',
        filter: { knowledgeBaseId: '42' },
      });
    }
  });

  it('ranks an exact-term passage above a higher-scoring paraphrase', async () => {
    const { deps: dependencies } = deps([
      [
        hit('c-1', 0.81, {
          chunkIndex: 1,
          text: 'Le budget du projet reste maîtrisé cette année.',
        }),
        hit('c-2', 0.74, { chunkIndex: 2, text: 'Le budget du pilote est de 90 000 EUR en 2026.' }),
      ],
    ]);

    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'budget 90 000 EUR 2026',
      topK: 2,
      deps: dependencies,
    });

    expect(items.map((item) => item.chunkId)).toEqual(['c-2', 'c-1']);
  });

  it('caps how many passages one document may occupy so other documents surface', async () => {
    const { deps: dependencies } = deps([
      [
        hit('a-1', 0.9, { documentId: '1', chunkIndex: 0, text: 'pilote alpha un' }),
        hit('a-2', 0.89, { documentId: '1', chunkIndex: 1, text: 'pilote alpha deux' }),
        hit('a-3', 0.88, { documentId: '1', chunkIndex: 2, text: 'pilote alpha trois' }),
        hit('b-1', 0.5, { documentId: '2', chunkIndex: 0, text: 'pilote beta un' }),
      ],
    ]);

    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'pilote',
      topK: 3,
      ranking: { ...KNOWLEDGE_RANKING, maxPerDocument: 2 },
      deps: dependencies,
    });

    expect(items.map((item) => item.documentId)).toEqual(['1', '1', '2']);
  });

  it('drops near-duplicate passages in favour of complementary evidence', async () => {
    const { deps: dependencies } = deps([
      [
        hit('d-1', 0.9, { documentId: '1', chunkIndex: 0, text: 'Le pilote dure six semaines.' }),
        hit('d-2', 0.89, { documentId: '2', chunkIndex: 0, text: 'Le pilote dure six semaines.' }),
        hit('d-3', 0.4, { documentId: '3', chunkIndex: 0, text: 'Le budget atteint 90 000 EUR.' }),
      ],
    ]);

    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'pilote budget',
      topK: 2,
      deps: dependencies,
    });

    expect(items.map((item) => item.chunkId)).toEqual(['d-1', 'd-3']);
  });

  it('never re-admits a near-duplicate passage to fill the budget', async () => {
    const { deps: dependencies } = deps([
      [
        hit('e-1', 0.9, { documentId: '1', chunkIndex: 0, text: 'Le pilote dure six semaines.' }),
        hit('e-2', 0.89, { documentId: '2', chunkIndex: 0, text: 'Le pilote dure six semaines.' }),
      ],
    ]);

    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'pilote',
      topK: 5,
      deps: dependencies,
    });

    expect(items.map((item) => item.chunkId)).toEqual(['e-1']);
  });

  it('exposes the ranking components so scoring is explainable', async () => {
    const { deps: dependencies } = deps([
      [hit('g-1', 0.8, { documentId: '1', chunkIndex: 0, text: 'Budget 90 000 EUR' })],
    ]);

    const [item] = await retrieveKnowledgeEvidence({
      source,
      query: 'budget 90000',
      deps: dependencies,
    });

    expect(item!.ranking).toEqual({
      semantic: 0.8,
      lexical: expect.any(Number),
      position: 1,
      score: expect.any(Number),
      candidateSources: ['semantic'],
    });
    expect(item!.ranking.score).toBeGreaterThan(0);
  });

  it('fuses lexical-only candidates and expands same-section neighbors within the final bound', async () => {
    const semantic = hit('section:direct', 0.88, {
      documentId: '1',
      parentSectionId: 'section-a',
      nextChunkId: 'section:neighbor',
      text: 'Le dispositif comporte une étape initiale.',
    });
    const lexical = hit('section:exact', 0.9, {
      documentId: '2',
      text: 'Identifiant exact ZX-9917.',
    });
    const neighbor = hit('section:neighbor', 0, {
      documentId: '1',
      chunkIndex: 1,
      parentSectionId: 'section-a',
      text: 'La seconde étape valide le résultat.',
    });
    const { deps: dependencies } = deps([[semantic]]);
    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'ZX-9917 étapes du dispositif',
      topK: 3,
      deps: {
        ...dependencies,
        lexicalStore: {
          search: vi.fn().mockResolvedValue([lexical]),
          byIds: vi.fn().mockResolvedValue([neighbor]),
        },
      },
    });

    expect(items.map((item) => item.chunkId)).toEqual([
      'section:direct',
      'section:exact',
      'section:neighbor',
    ]);
    expect(items[1]!.ranking.candidateSources).toEqual(['lexical']);
    expect(items[2]!.ranking.candidateSources).toEqual(['neighbor']);
  });

  it('returns the section heading path so passages keep their context', async () => {
    const { deps: dependencies } = deps([
      [hit('h-1', 0.8, { headingPath: 'Pilote > Budget', text: 'Budget 90 000 EUR.' })],
    ]);

    const items = await retrieveKnowledgeEvidence({
      source,
      query: 'budget',
      topK: 1,
      deps: dependencies,
    });

    expect(items[0]!.headingPath).toBe('Pilote > Budget');
  });
});
