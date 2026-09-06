import { fastembed } from '@mastra/fastembed';

import {
  DATASET_CASES,
  DATASET_CHUNKS,
} from '../../src/lib/sources/__tests__/fixtures/retrievalDataset';
import {
  KNOWLEDGE_DEFAULT_TOP_K,
  KNOWLEDGE_MIN_SCORE,
  retrieveKnowledgeEvidence,
} from '../../src/lib/sources/knowledgeRetrieval';
import { evaluateRetrieval } from '../../src/lib/sources/retrievalEval';

const thresholds = Array.from({ length: 31 }, (_, index) => 0.4 + index * 0.02);
const answerableCases = DATASET_CASES.filter((testCase) => testCase.expectedChunkIds.length > 0);

type CalibrationRow = {
  minScore: number;
  recall: number;
  answerableRecall: number;
  mrr: number;
  contextPrecision: number;
  ndcg: number;
  noAnswerPrecision: number | null;
};

function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index++) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / Math.sqrt(leftNorm * rightNorm);
}

function selectThreshold(rows: CalibrationRow[]): CalibrationRow {
  const completeAbstention = rows.filter((row) => row.noAnswerPrecision === 1);
  if (completeAbstention.length === 0) {
    throw new Error('Calibration found no threshold with complete no-answer abstention.');
  }
  return completeAbstention.reduce((best, row) => {
    if (row.answerableRecall > best.answerableRecall) return row;
    if (row.answerableRecall === best.answerableRecall && row.minScore < best.minScore) return row;
    return best;
  });
}

const chunkInputs = DATASET_CHUNKS.map((chunk) =>
  chunk.headingPath ? `${chunk.headingPath}\n${chunk.text}` : chunk.text,
);
const values = [...chunkInputs, ...DATASET_CASES.map((testCase) => testCase.query)];
const { embeddings } = await fastembed.doEmbed({ values });
const chunkVectors = embeddings.slice(0, DATASET_CHUNKS.length);
const queryVectors = embeddings.slice(DATASET_CHUNKS.length);

const retrieve = async (testCase: (typeof DATASET_CASES)[number], minScore: number) => {
  const queryIndex = DATASET_CASES.findIndex((candidate) => candidate.id === testCase.id);
  const queryVector = queryVectors[queryIndex]!;
  const items = await retrieveKnowledgeEvidence({
    source: { knowledgeBaseId: 'calibration', indexName: 'knowledge_calibration' },
    query: testCase.query,
    topK: KNOWLEDGE_DEFAULT_TOP_K,
    minScore,
    deps: {
      embedQuery: async () => queryVector,
      vectorStore: {
        query: async ({ topK, minScore: floor, filter }) =>
          DATASET_CHUNKS.map((chunk, index) => ({
            id: chunk.chunkId,
            score: cosine(queryVector, chunkVectors[index]!),
            metadata: {
              knowledgeBaseId: filter.knowledgeBaseId,
              documentId: chunk.documentId,
              title: chunk.documentTitle,
              chunkIndex: index,
              chunkId: chunk.chunkId,
              text: chunk.text,
              ...(chunk.headingPath ? { headingPath: chunk.headingPath } : {}),
            },
          }))
            .filter((hit) => hit.score > floor)
            .sort((left, right) => right.score - left.score)
            .slice(0, topK),
      },
    },
  });
  return items.map((item) => item.chunkId);
};

const rows: CalibrationRow[] = [];
for (const minScore of thresholds) {
  const report = await evaluateRetrieval({
    strategy: `production-pipeline-min-${minScore.toFixed(3)}`,
    cases: DATASET_CASES,
    retrieve: (testCase) => retrieve(testCase, minScore),
    documentOf: (chunkId) =>
      DATASET_CHUNKS.find((chunk) => chunk.chunkId === chunkId)?.documentId ?? chunkId,
  });
  const answerableReport = await evaluateRetrieval({
    strategy: `production-pipeline-min-${minScore.toFixed(3)}-answerable`,
    cases: answerableCases,
    retrieve: (testCase) => retrieve(testCase, minScore),
  });
  const row = {
    minScore,
    recall: report.recall,
    answerableRecall: answerableReport.recall,
    mrr: report.mrr,
    contextPrecision: report.contextPrecision,
    ndcg: report.ndcg,
    noAnswerPrecision: report.noAnswerPrecision,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}

const selected = selectThreshold(rows);
console.log(
  JSON.stringify({ selectedMinScore: selected.minScore, shippedMinScore: KNOWLEDGE_MIN_SCORE }),
);
if (Math.abs(selected.minScore - KNOWLEDGE_MIN_SCORE) > Number.EPSILON) {
  throw new Error(
    `Calibrated threshold ${selected.minScore} differs from KNOWLEDGE_MIN_SCORE ${KNOWLEDGE_MIN_SCORE}.`,
  );
}
