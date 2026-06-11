/**
 * Tunable knobs for the AI draft pipeline and build trigger, in one place.
 *
 * Centralising them follows the per-concern SSOT pattern (`status.ts`,
 * `context.ts`, `slug.ts`) so behaviour can be tuned by editing this file rather
 * than hunting literals across modules.
 */

/** Minimum slides a drafted deck must have (schema floor). */
export const MIN_SLIDES = 3;

/**
 * Maximum slides a drafted deck may have (schema ceiling). 40 — not 20 — so a
 * long structured brief (e.g. a 26-slide webinar) validates instead of being
 * rejected after generation.
 */
export const MAX_SLIDES = 40;

/** Chars of per-slide intent kept when parsing an explicit `S1 — …` brief. */
export const INTENT_MAX = 1600;

/**
 * Minimum gap between on-demand build triggers for one presentation. The build
 * spawns a Chromium/Slidev process, so the trigger endpoint rejects (429) a
 * second request inside this window. Enforced via an enqueue-time timestamp,
 * not the worker-written status (which lags by a cron tick).
 */
export const BUILD_COOLDOWN_MS = 30_000;
