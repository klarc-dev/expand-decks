/**
 * Drives deckWorkflow from a plain brief string — the single entry point the
 * diagnostic scripts (draft-smoke, draft-eval, e2e-verify) use to draft a deck.
 */
import { resolveTargetLanguage } from './language';
import { mastra } from './mastra';
import { legacySourcePolicy, normalizeSourcePolicy } from '../lib/sources/policy';
import type { SourcePolicy } from '../lib/sources/types';
import type { DeckWorkflowOutput } from './workflow';

export async function runDeckFromBrief(
  brief: string,
  opts: {
    visual?: boolean;
    sourceIds?: string[];
    sourcePolicy?: SourcePolicy;
    language?: 'fr' | 'en';
  } = {},
): Promise<DeckWorkflowOutput> {
  const sourcePolicy = opts.sourcePolicy
    ? normalizeSourcePolicy(opts.sourcePolicy)
    : legacySourcePolicy(opts.sourceIds);
  const run = await mastra.getWorkflow('deckWorkflow').createRun();
  const result = await run.start({
    inputData: {
      brief,
      language: resolveTargetLanguage(opts.language, brief),
      sourcePolicy,
      visual: opts.visual === true,
      approvalRequired: false,
    },
  });
  if (result.status !== 'success') {
    throw new Error(
      `[runDeckFromBrief] workflow ${result.status}` +
        (result.status === 'failed' ? `: ${result.error?.message ?? ''}` : ''),
    );
  }
  return result.result;
}
