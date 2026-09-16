export type GroundedRetrievalCase = {
  id: string;
  requiredConcepts: string[];
  evidence: string[];
};

export type GroundedRetrievalReport = {
  completeness: number;
  cases: {
    id: string;
    completeness: number;
    missingConcepts: string[];
  }[];
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministic downstream gate: required deck concepts must already be present
 * in captured verbatim evidence. It complements the model-based deck grounding
 * scorer without adding a network dependency to ordinary retrieval evaluation.
 */
export function evaluateGroundedRetrieval(
  cases: readonly GroundedRetrievalCase[],
): GroundedRetrievalReport {
  const reports = cases.map((testCase) => {
    const evidence = normalize(testCase.evidence.join('\n'));
    const missingConcepts = testCase.requiredConcepts.filter(
      (concept) => !evidence.includes(normalize(concept)),
    );
    return {
      id: testCase.id,
      completeness: testCase.requiredConcepts.length
        ? (testCase.requiredConcepts.length - missingConcepts.length) /
          testCase.requiredConcepts.length
        : 1,
      missingConcepts,
    };
  });
  return {
    completeness: reports.length
      ? reports.reduce((sum, report) => sum + report.completeness, 0) / reports.length
      : 1,
    cases: reports,
  };
}
