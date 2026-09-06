import { fastembed } from '@mastra/fastembed';

import {
  DATASET_CASES,
  DATASET_CHUNKS,
} from '../../src/lib/sources/__tests__/fixtures/retrievalDataset';
import { evaluateRetrieval } from '../../src/lib/sources/retrievalEval';

const TOP_K = 3;
const thresholds = Array.from({ length: 31 }, (_, index) => 0.4 + index * 0.02);

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

const chunkInputs = DATASET_CHUNKS.map((chunk) =>
  chunk.headingPath ? `${chunk.headingPath}\n${chunk.text}` : chunk.text,
);
const values = [...chunkInputs, ...DATASET_CASES.map((testCase) => testCase.query)];
const { embeddings } = await fastembed.doEmbed({ values });
const chunkVectors = embeddings.slice(0, DATASET_CHUNKS.length);
const queryVectors = embeddings.slice(DATASET_CHUNKS.length);

for (const minScore of thresholds) {
  const report = await evaluateRetrieval({
    strategy: `fastembed-cosine-min-${minScore.toFixed(3)}`,
    cases: DATASET_CASES,
    retrieve: async (testCase) => {
      const queryIndex = DATASET_CASES.findIndex((candidate) => candidate.id === testCase.id);
      const queryVector = queryVectors[queryIndex]!;
      return DATASET_CHUNKS.map((chunk, index) => ({
        chunkId: chunk.chunkId,
        score: cosine(queryVector!, chunkVectors[index]!),
      }))
        .filter((hit) => hit.score >= minScore)
        .sort((left, right) => right.score - left.score)
        .slice(0, TOP_K)
        .map((hit) => hit.chunkId);
    },
    documentOf: (chunkId) =>
      DATASET_CHUNKS.find((chunk) => chunk.chunkId === chunkId)?.documentId ?? chunkId,
  });
  const answerableCases = DATASET_CASES.filter((testCase) => testCase.expectedChunkIds.length > 0);
  const answerableReport = await evaluateRetrieval({
    strategy: `fastembed-cosine-min-${minScore.toFixed(3)}-answerable`,
    cases: answerableCases,
    retrieve: async (testCase) => {
      const queryIndex = DATASET_CASES.findIndex((candidate) => candidate.id === testCase.id);
      const queryVector = queryVectors[queryIndex]!;
      return DATASET_CHUNKS.map((chunk, index) => ({
        chunkId: chunk.chunkId,
        score: cosine(queryVector!, chunkVectors[index]!),
      }))
        .filter((hit) => hit.score >= minScore)
        .sort((left, right) => right.score - left.score)
        .slice(0, TOP_K)
        .map((hit) => hit.chunkId);
    },
  });
  console.log(
    JSON.stringify({
      minScore,
      recall: report.recall,
      answerableRecall: answerableReport.recall,
      mrr: report.mrr,
      contextPrecision: report.contextPrecision,
      ndcg: report.ndcg,
      noAnswerPrecision: report.noAnswerPrecision,
    }),
  );
}
