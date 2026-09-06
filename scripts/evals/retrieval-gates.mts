import { evaluateRetrieval } from '../../src/lib/sources/retrievalEval.ts';
import {
  KNOWLEDGE_RANKING,
  KNOWLEDGE_MIN_SCORE,
  retrieveKnowledgeEvidence,
} from '../../src/lib/sources/knowledgeRetrieval.ts';
import {
  DATASET_CASES,
  DATASET_CHUNKS,
} from '../../src/lib/sources/__tests__/fixtures/retrievalDataset.ts';
import { simulatedVectorHits } from '../../src/lib/sources/__tests__/support/retrievalHarness.ts';

const TOP_K = 3;

async function run(minScore: number) {
  return evaluateRetrieval({
    strategy: `minScore=${minScore}`,
    cases: DATASET_CASES,
    documentOf: (chunkId) => chunkId.split(':')[0]!,
    retrieve: async (testCase) => {
      const items = await retrieveKnowledgeEvidence({
        source: { knowledgeBaseId: 1, indexName: 'knowledge_1' },
        query: testCase.query,
        topK: TOP_K,
        ranking: KNOWLEDGE_RANKING,
        deps: {
          embedQuery: async () => [],
          vectorStore: {
            query: async () => simulatedVectorHits(DATASET_CHUNKS, testCase.query, minScore),
          } as never,
        },
      });
      return items.map((item) => item.chunkId);
    },
  });
}

console.log('minScore  recall   ndcg    dupRate  docDiv   noAnsP');
for (const minScore of [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, KNOWLEDGE_MIN_SCORE]) {
  const r = await run(minScore);
  console.log(
    String(minScore).padEnd(9),
    r.recall.toFixed(3).padEnd(8),
    r.ndcg.toFixed(3).padEnd(7),
    r.duplicateRate.toFixed(3).padEnd(8),
    r.documentDiversity.toFixed(3).padEnd(8),
    r.noAnswerPrecision.toFixed(3),
  );
}
