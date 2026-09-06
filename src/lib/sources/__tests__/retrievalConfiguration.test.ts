import { describe, expect, it } from 'vitest';

import {
  KNOWLEDGE_RANKING,
  retrieveKnowledgeEvidence,
  type KnowledgeRankingConfig,
} from '../knowledgeRetrieval';
import { evaluateRetrieval } from '../retrievalEval';
import { DATASET_CASES, DATASET_CHUNKS, type DatasetCase } from './fixtures/retrievalDataset';
import { simulatedVectorHits } from './support/retrievalHarness';

/**
 * Topic-only vector signal: chunks of one document share that document's mean
 * similarity. This reproduces the weakness of a real dense embedding — it finds
 * the right document but cannot pick the right passage within it — which is
 * exactly the gap lexical scoring and the diversity cap have to close.
 */
function topicOnlyRetriever(ranking: KnowledgeRankingConfig, topK: number) {
  return async (testCase: DatasetCase) => {
    const items = await retrieveKnowledgeEvidence({
      source: { knowledgeBaseId: 1, indexName: 'knowledge_1' },
      query: testCase.query,
      topK,
      ranking,
      deps: {
        embedQuery: async () => [],
        vectorStore: {
          query: async () => {
            const hits = simulatedVectorHits(DATASET_CHUNKS, testCase.query, 0);
            const byDocument = new Map<string, number[]>();
            for (const hit of hits) {
              const key = String(hit.metadata!.documentId);
              byDocument.set(key, [...(byDocument.get(key) ?? []), hit.score]);
            }
            return hits
              .map((hit) => {
                const scores = byDocument.get(String(hit.metadata!.documentId))!;
                return { ...hit, score: scores.reduce((a, b) => a + b, 0) / scores.length };
              })
              .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
          },
        } as never,
      },
    });
    return items.map((item) => item.chunkId);
  };
}

const evaluate = (ranking: KnowledgeRankingConfig, cases = DATASET_CASES, topK = 3) =>
  evaluateRetrieval({ strategy: 'measured', cases, retrieve: topicOnlyRetriever(ranking, topK) });

describe('shipped retrieval configuration', () => {
  it('recalls every supporting passage in the dataset', async () => {
    const report = await evaluate(KNOWLEDGE_RANKING);
    expect(report.recall).toBe(1);
  });

  it('beats pure vector ranking on exact-term questions', async () => {
    const exact = DATASET_CASES.filter((testCase) => testCase.queryClass === 'exact-term');
    const vectorOnly = await evaluate(
      { ...KNOWLEDGE_RANKING, semanticWeight: 1, lexicalWeight: 0 },
      exact,
    );
    const shipped = await evaluate(KNOWLEDGE_RANKING, exact);

    expect(vectorOnly.mrr).toBeLessThan(1);
    expect(shipped.mrr).toBe(1);
  });

  it('beats pure vector ranking on semantic questions', async () => {
    const semantic = DATASET_CASES.filter((testCase) => testCase.queryClass === 'semantic');
    const vectorOnly = await evaluate(
      { ...KNOWLEDGE_RANKING, semanticWeight: 1, lexicalWeight: 0 },
      semantic,
    );
    const shipped = await evaluate(KNOWLEDGE_RANKING, semantic);

    expect(shipped.mrr).toBeGreaterThan(vectorOnly.mrr);
  });

  it('needs its per-document cap to answer multi-passage questions', async () => {
    const multi = DATASET_CASES.filter((testCase) => testCase.queryClass === 'multi-document');
    const capped = await evaluate({ ...KNOWLEDGE_RANKING, maxPerDocument: 2 }, multi);
    const shipped = await evaluate(KNOWLEDGE_RANKING, multi);

    expect(capped.recall).toBeLessThan(1);
    expect(shipped.recall).toBe(1);
  });

  it('does not improve by weighting lexical matching more heavily', async () => {
    const shipped = await evaluate(KNOWLEDGE_RANKING);
    const heavier = await evaluate({
      ...KNOWLEDGE_RANKING,
      semanticWeight: 0.45,
      lexicalWeight: 0.55,
    });

    expect(heavier.mrr).toBeLessThanOrEqual(shipped.mrr);
  });
});
