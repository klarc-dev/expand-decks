/**
 * Gather phase (documents-plugin `researcher` → dossier, slides-adapted).
 *
 * Turns a natural-language brief into a structured DeckDossier: the ONE core
 * idea, audience, so-what, key points, data, sources. When the author selected
 * external sources, this first queries them (via MCP tools) for grounded notes
 * and folds verified facts into the dossier's data/sources; with no sources it
 * is the original brief-only distillation.
 *
 * The LLM call uses a schema WITHOUT rawBrief (the model doesn't produce it).
 * rawBrief is injected after the call so the returned DeckDossier is complete.
 */
import type { RequestContext } from '@mastra/core/request-context';

import type { Evidence, SourcePolicy } from '../../lib/sources/types';
import { generateStructured } from '../model';
import { resolveTargetLanguage, type DeckLanguage } from '../language';
import { withDeckLanguage } from '../requestContext';
import { GATHER_INSTRUCTIONS, RESEARCH_INSTRUCTIONS } from '../prompts/phases';
import { findInformationalStyleViolations } from '../prompts/style';
import { DeckDossierSchema, type DeckDossier } from '../schemas';
import { researchSources } from './research';

const LLM_SCHEMA = DeckDossierSchema.omit({ rawBrief: true, language: true });

export type GatherResult = {
  dossier: DeckDossier;
  evidence: Evidence[];
  sourceFailures: import('../../lib/sources/types').SourceFailure[];
};

export async function gather(
  brief: string,
  sourcePolicy: SourcePolicy = { mode: 'none', sourceIds: [] },
  requestedLanguage?: DeckLanguage,
  abortSignal?: AbortSignal,
  userId?: string,
  requestContext?: RequestContext<any>,
): Promise<GatherResult> {
  const language = resolveTargetLanguage(requestedLanguage, brief);
  // The output language travels in the request context: every localized agent
  // (registry.ts) folds it into its own instructions.
  const context = withDeckLanguage(requestContext, language);
  const { notes, evidence, failures } = await researchSources(sourcePolicy, {
    name: 'gather:research',
    instructions: RESEARCH_INSTRUCTIONS,
    prompt: brief,
    abortSignal,
    userId,
    requestContext: context,
  });

  const prompt = notes
    ? `${brief}\n\n---\nNOTES DE RECHERCHE (issues des sources sélectionnées — n'utilise que ce qui est réellement pertinent, ne fabrique aucune citation) :\n${notes}`
    : brief;

  const dossier = await generateStructured({
    name: 'gather',
    instructions: GATHER_INSTRUCTIONS,
    schema: LLM_SCHEMA,
    prompt,
    validate: findInformationalStyleViolations,
    maxValidationRepairs: 3,
    requestContext: context,
    abortSignal,
  });
  return {
    dossier: {
      ...dossier,
      references: dossier.references ?? [],
      // A model may only name external source ids when the corresponding MCP
      // call produced captured provenance. Brief-only drafting stays unsourced.
      sources: evidence.length > 0 ? dossier.sources : [],
      rawBrief: brief,
      language,
    },
    evidence,
    sourceFailures: failures,
  };
}
