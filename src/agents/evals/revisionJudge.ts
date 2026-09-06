type RevisionDeckResult = {
  slides: unknown;
  [key: string]: unknown;
};

/**
 * Keep the revision judge on the user-visible artifact. Workflow dossier
 * metadata is regenerated internally and is not part of the revision contract.
 */
export function buildRevisionJudgePrompt({
  expectations,
  initial,
  final,
}: {
  expectations: unknown;
  initial: RevisionDeckResult;
  final: RevisionDeckResult;
}): string {
  return `EXPECTATIONS:\n${JSON.stringify(expectations, null, 2)}\n\nINITIAL SLIDES:\n${JSON.stringify(initial.slides, null, 2)}\n\nFINAL SLIDES:\n${JSON.stringify(final.slides, null, 2)}`;
}
