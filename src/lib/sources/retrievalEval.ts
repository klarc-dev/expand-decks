/**
 * Retrieval evaluation seam. Compares named retrieval strategies against a
 * versioned dataset so retrieval changes are promoted on measured evidence
 * rather than intuition.
 */

export type RetrievalCase = {
  id: string;
  query: string;
  /** Chunk ids that would each be acceptable supporting evidence. */
  expectedChunkIds: string[];
};

export type RetrievalCaseReport = {
  id: string;
  /** Share of expected chunks present in the returned set. */
  recall: number;
  /** 1 / rank of the first expected chunk, or 0 when none was returned. */
  reciprocalRank: number;
  /** Share of returned chunks that were expected. */
  precision: number;
  returned: number;
};

export type RetrievalReport = {
  strategy: string;
  cases: RetrievalCaseReport[];
  recall: number;
  mrr: number;
  contextPrecision: number;
};

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

export async function evaluateRetrieval<TCase extends RetrievalCase>(args: {
  strategy: string;
  cases: readonly TCase[];
  retrieve: (testCase: TCase) => Promise<string[]>;
}): Promise<RetrievalReport> {
  const cases: RetrievalCaseReport[] = [];
  for (const testCase of args.cases) {
    const returned = await args.retrieve(testCase);
    const expected = new Set(testCase.expectedChunkIds);
    const matched = returned.filter((chunkId) => expected.has(chunkId));
    const firstIndex = returned.findIndex((chunkId) => expected.has(chunkId));
    cases.push({
      id: testCase.id,
      recall: expected.size ? new Set(matched).size / expected.size : 0,
      reciprocalRank: firstIndex === -1 ? 0 : 1 / (firstIndex + 1),
      precision: returned.length ? matched.length / returned.length : 0,
      returned: returned.length,
    });
  }

  return {
    strategy: args.strategy,
    cases,
    recall: mean(cases.map((item) => item.recall)),
    mrr: mean(cases.map((item) => item.reciprocalRank)),
    contextPrecision: mean(cases.map((item) => item.precision)),
  };
}
