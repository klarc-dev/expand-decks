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
import { MAX_SLIDES, MIN_SLIDES } from '../../../lib/draftConfig';

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

/** Ordered blockType slugs of every AI-draftable spec (SSOT for the outline enum). */
export function draftBlockTypes(specs: BlockSpec[]): [string, ...string[]] {
  const slugs = specs.filter((s) => s.aiDraftable).map((s) => s.blockType);
  return slugs as [string, ...string[]];
}

/** One outline stub: which layout, its title, and a one-line intent for the fill pass. */
export type OutlineStub = { blockType: string; title: string; intent: string };

export type OutlineSchema = z.ZodObject<{
  slides: z.ZodArray<z.ZodType<OutlineStub>>;
}>;

/**
 * Pass-1 schema: a cheap list of `{ blockType, title, intent }` stubs that locks
 * the deck's exact slide count and ordering before any body is generated.
 */
export function emitOutlineSchema(specs: BlockSpec[]): OutlineSchema {
  const stub = z.object({
    blockType: z.enum(draftBlockTypes(specs)),
    title: z.string(),
    intent: z.string(),
  });
  return z.object({
    slides: z
      .array(stub as z.ZodType<OutlineStub>)
      .min(MIN_SLIDES)
      .max(MAX_SLIDES),
  }) as OutlineSchema;
}

/**
 * Pass-2 batch schema: `{ slides: union[] }` with no min/max — the batch size is
 * the contract (the orchestrator asks for exactly the stubs in this batch).
 */
export function emitBatchSchema(specs: BlockSpec[]): SlidesArraySchema {
  return z.object({
    slides: z.array(emitDraftSchema(specs) as z.ZodType<DraftedSlide>),
  }) as SlidesArraySchema;
}

/** A drafted slide block — at minimum it carries its layout discriminant. */
export type DraftedSlide = { blockType: string } & Record<string, unknown>;

/** Typed top-level draft schema so callers infer `{ slides: DraftedSlide[] }`. */
export type SlidesArraySchema = z.ZodObject<{
  slides: z.ZodArray<z.ZodType<DraftedSlide>>;
}>;

/**
 * Top-level draft schema: `{ slides: array(union).min(MIN_SLIDES).max(MAX_SLIDES) }`.
 * The bounds come from `draftConfig` (default 3..40) so a long structured brief —
 * e.g. a 26-slide webinar — validates instead of being rejected after generation.
 */
export function emitSlidesArraySchema(specs: BlockSpec[]): SlidesArraySchema {
  return z.object({
    slides: z
      .array(emitDraftSchema(specs) as z.ZodType<DraftedSlide>)
      .min(MIN_SLIDES)
      .max(MAX_SLIDES),
  }) as SlidesArraySchema;
}
