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
  latencyMs: number;
  returnedBytes: number;
  /** Share of expected chunks present in the returned set. */
  recall: number;
  /** 1 / rank of the first expected chunk, or 0 when none was returned. */
  reciprocalRank: number;
  /** Share of returned chunks that were expected. */
  precision: number;
  /** Normalised discounted cumulative gain: rewards ranking hits earlier. */
  ndcg: number;
  /** Share of returned chunks that repeat a chunk already returned. */
  duplicateRate: number;
  /** Distinct source documents divided by returned chunks. */
  documentDiversity: number;
  returned: number;
};

export type RetrievalReport = {
  strategy: string;
  cases: RetrievalCaseReport[];
  recall: number;
  mrr: number;
  contextPrecision: number;
  ndcg: number;
  duplicateRate: number;
  documentDiversity: number;
  /**
   * Share of cases with no expected evidence where retrieval correctly returned
   * nothing. A pipeline that always answers scores 0 here, which is how a
   * confidently wrong grounded answer gets caught.
   */
  noAnswerPrecision: number;
  returnedBytes: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
};

export type RetrievalPromotionThresholds = {
  minRecallGain: number;
  minNdcgGain: number;
  maxPrecisionLoss: number;
  minNoAnswerPrecision: number;
  maxP95LatencyMs: number;
  maxReturnedBytes: number;
};

export function assessRetrievalPromotion(
  baseline: RetrievalReport,
  candidate: RetrievalReport,
  thresholds: RetrievalPromotionThresholds,
  grounding: {
    baselineCompleteness: number;
    candidateCompleteness: number;
    minCompletenessGain: number;
  },
): { promoted: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (candidate.recall - baseline.recall < thresholds.minRecallGain) reasons.push('recall-gain');
  if (candidate.ndcg - baseline.ndcg < thresholds.minNdcgGain) reasons.push('ndcg-gain');
  if (baseline.contextPrecision - candidate.contextPrecision > thresholds.maxPrecisionLoss)
    reasons.push('context-precision');
  if (candidate.noAnswerPrecision < thresholds.minNoAnswerPrecision)
    reasons.push('no-answer-precision');
  if (candidate.p95LatencyMs > thresholds.maxP95LatencyMs) reasons.push('latency');
  if (candidate.returnedBytes > thresholds.maxReturnedBytes) reasons.push('bytes');
  if (
    grounding.candidateCompleteness - grounding.baselineCompleteness <
    grounding.minCompletenessGain
  )
    reasons.push('grounding-completeness');
  return { promoted: reasons.length === 0, reasons };
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

/**
 * Binary-gain nDCG. Gains are discounted by log2(rank + 1) and normalised
 * against the best achievable ordering for that case, so a run that finds the
 * same chunks but ranks them later scores strictly lower.
 */
function ndcgOf(returned: readonly string[], expected: ReadonlySet<string>): number {
  if (expected.size === 0) return 1;
  const dcg = returned.reduce(
    (total, chunkId, index) => total + (expected.has(chunkId) ? 1 / Math.log2(index + 2) : 0),
    0,
  );
  const idealHits = Math.min(expected.size, returned.length);
  const idealDcg = Array.from({ length: idealHits }).reduce<number>(
    (total, _, index) => total + 1 / Math.log2(index + 2),
    0,
  );
  return idealDcg === 0 ? 0 : dcg / idealDcg;
}

export async function evaluateRetrieval<TCase extends RetrievalCase>(args: {
  strategy: string;
  cases: readonly TCase[];
  retrieve: (testCase: TCase) => Promise<string[]>;
  /** Required because operational budgets must measure model-visible evidence, not ids. */
  bytesOf: (returned: readonly string[], testCase: TCase) => number;
  now?: () => number;
  /**
   * Maps a chunk id to its source document. Defaults to the `documentId:hash`
   * convention used by the ingest pipeline.
   */
  documentOf?: (chunkId: string) => string;
}): Promise<RetrievalReport> {
  const documentOf = args.documentOf ?? ((chunkId: string) => chunkId.split(':')[0]!);
  const now = args.now ?? (() => performance.now());
  const cases: RetrievalCaseReport[] = [];
  const noAnswerOutcomes: number[] = [];

  for (const testCase of args.cases) {
    const startedAt = now();
    const returned = await args.retrieve(testCase);
    const latencyMs = Math.max(0, now() - startedAt);
    const expected = new Set(testCase.expectedChunkIds);
    const matched = returned.filter((chunkId) => expected.has(chunkId));
    const firstIndex = returned.findIndex((chunkId) => expected.has(chunkId));

    if (expected.size === 0) {
      noAnswerOutcomes.push(returned.length === 0 ? 1 : 0);
    }

    cases.push({
      id: testCase.id,
      latencyMs,
      returnedBytes: args.bytesOf(returned, testCase),
      recall: expected.size ? new Set(matched).size / expected.size : 0,
      reciprocalRank: firstIndex === -1 ? 0 : 1 / (firstIndex + 1),
      precision: returned.length ? matched.length / returned.length : 0,
      ndcg: ndcgOf(returned, expected),
      duplicateRate: returned.length
        ? (returned.length - new Set(returned).size) / returned.length
        : 0,
      documentDiversity: returned.length
        ? new Set(returned.map(documentOf)).size / returned.length
        : 0,
      returned: returned.length,
    });
  }

  const percentile = (values: number[], fraction: number) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]!;
  };
  return {
    strategy: args.strategy,
    cases,
    recall: mean(cases.map((item) => item.recall)),
    mrr: mean(cases.map((item) => item.reciprocalRank)),
    contextPrecision: mean(cases.map((item) => item.precision)),
    ndcg: mean(cases.map((item) => item.ndcg)),
    duplicateRate: mean(cases.map((item) => item.duplicateRate)),
    documentDiversity: mean(cases.map((item) => item.documentDiversity)),
    // No unanswerable cases means nothing to get wrong, which scores a clean 1.
    noAnswerPrecision: noAnswerOutcomes.length ? mean(noAnswerOutcomes) : 1,
    returnedBytes: mean(cases.map((item) => item.returnedBytes)),
    p50LatencyMs: percentile(
      cases.map((item) => item.latencyMs),
      0.5,
    ),
    p95LatencyMs: percentile(
      cases.map((item) => item.latencyMs),
      0.95,
    ),
  };
}
