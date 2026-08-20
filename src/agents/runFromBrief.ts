/**
 * Drives deckWorkflow from a plain brief string — the single entry point the
 * diagnostic scripts (draft-smoke, draft-eval, e2e-verify) use to draft a deck.
 */
import { resolveTargetLanguage } from './language';
import { mastra } from './mastra';
import type { DeckWorkflowOutput } from './workflow';

export async function runDeckFromBrief(
  brief: string,
  opts: { visual?: boolean; sourceIds?: string[]; language?: 'fr' | 'en' } = {},
): Promise<DeckWorkflowOutput> {
  const run = await mastra.getWorkflow('deckWorkflow').createRun();
  const result = await run.start({
    inputData: {
      brief,
      language: resolveTargetLanguage(opts.language, brief),
      sourceIds: opts.sourceIds ?? [],
    },
    initialState: { visual: opts.visual === true },
  });
  if (result.status !== 'success') {
    throw new Error(
      `[runDeckFromBrief] workflow ${result.status}` +
        (result.status === 'failed' ? `: ${result.error?.message ?? ''}` : ''),
    );
  }
  return result.result;
}
