/**
 * Tunable knobs for the agentic (Mastra) presentation builder, kept separate
 * from the legacy two-pass `draftConfig`. One place to tune the agent runtime.
 */

/** Parallel writers in the Draft phase (.foreach concurrency). */
export const WRITER_CONCURRENCY = Number(process.env.WRITER_CONCURRENCY ?? 4);

/** Max revise iterations in the .dountil critique loop before accepting. */
export const REVISE_MAX_ITERATIONS = Number(process.env.REVISE_MAX_ITERATIONS ?? 2);

/**
 * Score (0..1) at or above which a slide is accepted by the critique loop.
 * Slides below this are revised (or, post-build, re-examined by the visual scorer).
 */
export const SCORE_THRESHOLD = Number(process.env.SCORE_THRESHOLD ?? 0.7);
