/**
 * L3 emitter — AI-draft Zod schema for the single-source block system.
 *
 * Derives the LLM structured-output schema from `BlockSpec[]` so the draft
 * route no longer hand-maintains a parallel copy of the block shapes. Each
 * AI-draftable block becomes `aiSchemaOf(spec)` (blockType literal + every
 * field whose `ai` is a Zod schema; `ai: false` and `preview` dropped), and
 * the members are combined into a plain `z.union`.
 *
 * Why `z.union`, not `z.discriminatedUnion`
 * -----------------------------------------
 * `z.discriminatedUnion` serializes to JSON Schema `oneOf`, which OpenAI
 * structured outputs rejects ("'oneOf' is not permitted"). `z.union`
 * serializes to the accepted `anyOf`. The `blockType` literal in each member
 * keeps validation equivalent to a discriminated union.
 *
 * `markdown` (and any other `aiDraftable: false` block) is excluded from the
 * union — it is an admin-only escape-hatch block, not AI-draftable.
 */

import { z } from 'zod';

import { aiSchemaOf, type BlockSpec } from '../dsl';

/**
 * Build the AI-draft union: a plain `z.union` of `aiSchemaOf(spec)` for every
 * block with `aiDraftable === true`. Non-draftable blocks (e.g. markdown) are
 * dropped.
 */
export function emitDraftSchema(specs: BlockSpec[]): z.ZodType {
  const members: z.ZodObject[] = specs
    .filter((spec) => spec.aiDraftable)
    .map((spec) => aiSchemaOf(spec));
  return z.union(members);
}

/**
 * Top-level draft schema: `{ slides: array(union).min(3).max(20) }`, matching
 * the route's `slidesArraySchema` exactly.
 */
export function emitSlidesArraySchema(specs: BlockSpec[]): z.ZodType {
  return z.object({
    slides: z.array(emitDraftSchema(specs)).min(3).max(20),
  });
}
