/**
 * Shared AI-draft surface — the single place that turns a natural-language
 * brief into a Zod-validated `{ slides }` payload. Both the admin draft route
 * (`/api/draft-presentation`) and the live smoke script (`scripts/draft-smoke.mjs`)
 * consume this, so the LLM schema + system prompt + model wiring live here once.
 *
 * This module is LLM-only: it never touches the database. The route still owns
 * persistence (`payload.update`) and authorization; this just produces slides.
 *
 * The schema and prompt are derived from the block-spec SSOT (`src/blocks/spec`)
 * — `markdown` drops out via `aiDraftable: false`, image/imagePosition via
 * per-field `ai: false`. Do not hand-maintain a parallel copy here.
 */

import { z } from 'zod';

import { DRAFT_MODEL, draftObject } from './ai';
import { ALL_SPECS } from '../blocks/spec';
import { emitSlidesArraySchema } from '../blocks/spec/emit/emitDraftSchema';
import { buildSystemPrompt } from '../blocks/spec/emit/emitPromptSection';

/** LLM structured-output schema: `{ slides: array(union).min(3).max(20) }`. */
export const SLIDES_SCHEMA = emitSlidesArraySchema(ALL_SPECS);

/** Full system prompt assembled from each AI-draftable spec's `promptMeta`. */
export const DRAFT_SYSTEM_PROMPT = buildSystemPrompt(
  ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : [])),
);

/** Validated draft payload — `slides` is the non-null union array (min 3). */
export type DraftedSlides = z.infer<typeof SLIDES_SCHEMA>;

/**
 * Draft slides from a natural-language brief via tool calling (see
 * `src/lib/ai.ts` for why we use `draftObject` over `generateObject`).
 * `draftObject` validates the output against `SLIDES_SCHEMA` before returning.
 *
 * @throws if the model does not call the tool or its arguments fail validation
 *         (the route surfaces this as a 422).
 */
export async function draftPresentationSlides(
  brief: string,
  opts?: { model?: string },
): Promise<DraftedSlides> {
  return draftObject({
    model: opts?.model ?? DRAFT_MODEL,
    schema: SLIDES_SCHEMA,
    system: DRAFT_SYSTEM_PROMPT,
    prompt: brief,
  });
}
