/**
 * Tunable knobs for the AI draft pipeline and build trigger, in one place.
 *
 * These were previously inline magic numbers scattered across
 * `draftPresentation.ts` and `emitDraftSchema.ts`. Centralising them follows the
 * per-concern SSOT pattern (`status.ts`, `context.ts`, `slug.ts`) so behaviour
 * can be tuned by editing this file rather than hunting literals across modules.
 */

/** Slides drafted per fill-pass LLM call. Small batches keep each call fast. */
export const BATCH_SIZE = 3;

/** Minimum slides a drafted deck must have (schema floor). */
export const MIN_SLIDES = 3;

/**
 * Maximum slides a drafted deck may have (schema ceiling). 40 — not 20 — so a
 * long structured brief (e.g. a 26-slide webinar) validates instead of being
 * rejected after generation.
 */
export const MAX_SLIDES = 40;

/** Chars of the brief carried into each fill-pass prompt as global context. */
export const BRIEF_CONTEXT_MAX = 2400;

/** Chars of per-slide intent kept when parsing an explicit `S1 — …` brief. */
export const INTENT_MAX = 1600;

/**
 * Minimum gap between on-demand build triggers for one presentation. The build
 * spawns a Chromium/Slidev process, so the trigger endpoint rejects (429) a
 * second request inside this window. Enforced via an enqueue-time timestamp,
 * not the worker-written status (which lags by a cron tick).
 */
export const BUILD_COOLDOWN_MS = 30_000;
