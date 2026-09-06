import { evaluateRetrieval } from '../../src/lib/sources/retrievalEval.ts';
import {
  retrieveKnowledgeEvidence,
  KNOWLEDGE_MIN_SCORE,
  type KnowledgeRankingConfig,
} from '../../src/lib/sources/knowledgeRetrieval.ts';
import {
  DATASET_CASES,
  DATASET_CHUNKS,
} from '../../src/lib/sources/__tests__/fixtures/retrievalDataset.ts';
import { simulatedVectorHits } from '../../src/lib/sources/__tests__/support/retrievalHarness.ts';

const TOP_K = 3;

function retrieverFor(ranking: KnowledgeRankingConfig) {
  return async (testCase: { query: string }) => {
    const items = await retrieveKnowledgeEvidence({
      source: { knowledgeBaseId: 1, indexName: 'knowledge_1' },
      query: testCase.query,
      topK: TOP_K,
      ranking,
      deps: {
        embedQuery: async () => [],
        vectorStore: {
          query: async () => simulatedVectorHits(DATASET_CHUNKS, testCase.query, 0),
        } as never,
      },
    });
    return items.map((item) => item.chunkId);
  };
}

const results: {
  label: string;
  ranking: KnowledgeRankingConfig;
  recall: number;
  mrr: number;
  precision: number;
}[] = [];

for (const lexicalWeight of [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.7]) {
  for (const positionWeight of [0, 0.05, 0.1]) {
    for (const maxPerDocument of [1, 2, 3, 5]) {
      const ranking: KnowledgeRankingConfig = {
        semanticWeight: 1 - lexicalWeight,
        lexicalWeight,
        positionWeight,
        maxPerDocument,
      };
      const report = await evaluateRetrieval({
        strategy: `lex=${lexicalWeight} pos=${positionWeight} perDoc=${maxPerDocument}`,
        cases: DATASET_CASES,
        retrieve: retrieverFor(ranking),
      });
      results.push({
        label: report.strategy,
        ranking,
        recall: report.recall,
        mrr: report.mrr,
        precision: report.contextPrecision,
      });
    }
  }
}

// Primary objective: recall, then MRR, then context precision.
results.sort((a, b) => b.recall - a.recall || b.mrr - a.mrr || b.precision - a.precision);

console.log('TOP 12 CONFIGURATIONS');
for (const row of results.slice(0, 12)) {
  console.log(
    `${row.label.padEnd(34)} recall=${row.recall.toFixed(3)} mrr=${row.mrr.toFixed(3)} ctxP=${row.precision.toFixed(3)}`,
  );
}

const baseline = results.find(
  (r) =>
    r.ranking.lexicalWeight === 0 &&
    r.ranking.positionWeight === 0.05 &&
    r.ranking.maxPerDocument === 2,
);
console.log('\nPURE-VECTOR BASELINE (lex=0, perDoc=2)');
console.log(
  `recall=${baseline?.recall.toFixed(3)} mrr=${baseline?.mrr.toFixed(3)} ctxP=${baseline?.precision.toFixed(3)}`,
);

const shipped = results.find(
  (r) =>
    r.ranking.lexicalWeight === 0.35 &&
    r.ranking.positionWeight === 0.05 &&
    r.ranking.maxPerDocument === 2,
);
console.log('\nCURRENTLY SHIPPED (lex=0.35, pos=0.05, perDoc=2)');
console.log(
  `recall=${shipped?.recall.toFixed(3)} mrr=${shipped?.mrr.toFixed(3)} ctxP=${shipped?.precision.toFixed(3)}`,
);
console.log(`rank among ${results.length} configs: ${results.indexOf(shipped!) + 1}`);
