import { evaluateRetrieval } from '../../src/lib/sources/retrievalEval.ts';
import {
  retrieveKnowledgeEvidence,
  type KnowledgeRankingConfig,
} from '../../src/lib/sources/knowledgeRetrieval.ts';
import {
  DATASET_CASES,
  DATASET_CHUNKS,
} from '../../src/lib/sources/__tests__/fixtures/retrievalDataset.ts';
import { simulatedVectorHits } from '../../src/lib/sources/__tests__/support/retrievalHarness.ts';

const TOP_K = 3;

function retrieverFor(ranking: KnowledgeRankingConfig, degradeVector: boolean) {
  return async (testCase: { query: string }) => {
    const items = await retrieveKnowledgeEvidence({
      source: { knowledgeBaseId: 1, indexName: 'knowledge_1' },
      query: testCase.query,
      topK: TOP_K,
      ranking,
      deps: {
        embedQuery: async () => [],
        vectorStore: {
          query: async () => {
            const hits = simulatedVectorHits(DATASET_CHUNKS, testCase.query, 0);
            if (!degradeVector) return hits;
            // Genuinely topic-only: every chunk of a document collapses to that
            // document's mean similarity, so rare exact tokens (codes, amounts)
            // no longer distinguish chunks within a document. This is the
            // weakness a real dense embedding has and lexical scoring must cover.
            const byDocument = new Map<string, number[]>();
            for (const hit of hits) {
              const key = String(hit.metadata!.documentId);
              byDocument.set(key, [...(byDocument.get(key) ?? []), hit.score]);
            }
            return hits
              .map((hit) => {
                const scores = byDocument.get(String(hit.metadata!.documentId))!;
                return {
                  ...hit,
                  score: scores.reduce((a, b) => a + b, 0) / scores.length,
                };
              })
              .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
          },
        } as never,
      },
    });
    return items.map((item) => item.chunkId);
  };
}

for (const degrade of [false, true]) {
  console.log(`\n=== vector signal: ${degrade ? 'DEGRADED (topic-only)' : 'SHARP (trigram)'} ===`);
  for (const cls of ['exact-term', 'semantic', 'multi-document'] as const) {
    const cases = DATASET_CASES.filter((c) => c.queryClass === cls);
    const row: string[] = [];
    for (const lexicalWeight of [0, 0.15, 0.35, 0.55]) {
      const report = await evaluateRetrieval({
        strategy: 'x',
        cases,
        retrieve: retrieverFor(
          {
            semanticWeight: 1 - lexicalWeight,
            lexicalWeight,
            positionWeight: 0.05,
            maxPerDocument: 3,
          },
          degrade,
        ),
      });
      row.push(`lex=${lexicalWeight}: R=${report.recall.toFixed(2)} MRR=${report.mrr.toFixed(2)}`);
    }
    console.log(cls.padEnd(16), row.join('  '));
  }
}
