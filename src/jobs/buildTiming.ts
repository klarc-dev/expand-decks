/**
 * Tiny, dependency-free stage timer for the slide build job. Records named
 * stage durations and emits one compact, data-only log line so build logs show
 * whether hydration, markdown render, staging, Slidev build/export, upload, SPA
 * copy, or cache assembly dominates a real run (plan U1 / R10).
 *
 * Deliberately content-free: it records durations and small scalar metadata
 * only — never slide text, prompts, or rendered markdown.
 *
 * `now` is injectable so tests can drive a fake clock; it defaults to a
 * monotonic millisecond source.
 */
export type Now = () => number;

const defaultNow: Now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export type StageTimings = Record<string, number>;

export type BuildTimer = {
  /**
   * Time an async stage. Records elapsed ms under `name` even when `fn` throws,
   * then rethrows so callers see the original failure.
   */
  stage<T>(name: string, fn: () => Promise<T>): Promise<T>;
  /** Mark a synchronous boundary, returning ms elapsed since the timer started. */
  mark(name: string): number;
  /** Record elapsed ms since a previously captured elapsed() value. */
  recordSince(name: string, sinceMs: number): number;
  /** Snapshot of all recorded stage durations (ms, rounded). */
  durations(): StageTimings;
  /** Total ms elapsed since the timer was created. */
  elapsed(): number;
};

export function createBuildTimer(now: Now = defaultNow): BuildTimer {
  const start = now();
  const timings: StageTimings = {};

  return {
    async stage(name, fn) {
      const stageStart = now();
      try {
        return await fn();
      } finally {
        timings[name] = Math.round(now() - stageStart);
      }
    },
    mark(name) {
      const elapsed = Math.round(now() - start);
      timings[name] = elapsed;
      return elapsed;
    },
    recordSince(name, sinceMs) {
      const delta = Math.round(now() - start - sinceMs);
      timings[name] = delta;
      return delta;
    },
    durations() {
      return { ...timings };
    },
    elapsed() {
      return Math.round(now() - start);
    },
  };
}

export type BuildLogMeta = {
  presentationId?: string;
  buildToken?: string;
  outputs?: string;
  outputPolicy?: string;
  slideCount?: number;
  hasMermaid?: boolean;
  cacheMode?: string;
};

/**
 * Build a flat, undefined-free payload for a single structured build-log line.
 * Optional metadata fields are omitted (not serialized as `undefined`) so the
 * log stays terse.
 */
export function buildLogPayload(
  meta: BuildLogMeta,
  timings: StageTimings,
  totalMs: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) payload[key] = value;
  }
  payload.totalMs = totalMs;
  payload.timings = timings;
  return payload;
}
