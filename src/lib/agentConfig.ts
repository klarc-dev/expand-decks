/**
 * Tunable knobs for the agentic (Mastra) presentation builder, kept separate
 * from the legacy two-pass `draftConfig`. One place to tune the agent runtime.
 */

function numberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** Parallel writers in the Draft phase (.foreach concurrency). */
export const WRITER_CONCURRENCY = numberEnv('WRITER_CONCURRENCY', 4, 1, 16);

/** Max revise iterations in the .dountil critique loop before accepting. */
export const REVISE_MAX_ITERATIONS = numberEnv('REVISE_MAX_ITERATIONS', 2, 0, 8);

/**
 * Score (0..1) at or above which a slide is accepted by the critique loop.
 * Slides below this are revised (or, post-build, re-examined by the visual scorer).
 */
export const SCORE_THRESHOLD = numberEnv('SCORE_THRESHOLD', 0.7, 0, 1);

export const VISUAL_IMAGE_MAX_WIDTH = numberEnv('VISUAL_IMAGE_MAX_WIDTH', 1280, 320, 1920);
export const VISUAL_IMAGE_MAX_HEIGHT = numberEnv('VISUAL_IMAGE_MAX_HEIGHT', 720, 180, 1080);
export const VISUAL_IMAGE_MAX_BYTES = numberEnv(
  'VISUAL_IMAGE_MAX_BYTES',
  750_000,
  100_000,
  2_000_000,
);
export const VISUAL_IMAGE_JPEG_QUALITY = numberEnv('VISUAL_IMAGE_JPEG_QUALITY', 78, 40, 95);
