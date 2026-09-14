/** Payload's built-in jobs collection (not re-exported from the package root). */
const JOBS_COLLECTION = 'payload-jobs';

type StalledJob = { id: number | string; taskSlug?: string | null; updatedAt?: string | null };

type SweepPayload = {
  find: (args: unknown) => Promise<{ docs: StalledJob[] }>;
  update: (args: unknown) => Promise<unknown>;
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
};

/** A job still flagged `processing` after this long has lost its worker. */
export const STALLED_JOB_AFTER_MS = 30 * 60 * 1000;
/** How often the owner process re-checks for stalled jobs. */
export const STALLED_JOB_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Releases jobs whose worker died mid-run. Payload flags a job `processing`
 * when a worker picks it up and only clears the flag when the run ends; a
 * worker replaced during a deploy (or OOM-killed) leaves the flag set forever.
 * Because tasks declare a concurrency key (one build per deck), a stranded
 * flag silently blocks every later job for that deck: they sit at zero tries
 * with no error. Seen in production on 2026-09-14 with a deck unbuilt since
 * August.
 *
 * Only jobs untouched for STALLED_JOB_AFTER_MS are released, so a long but
 * live run on another container is never handed to a second worker. The
 * runner's build-token check makes a re-run of a superseded job a no-op.
 */
export async function requeueStalledJobs(
  payload: SweepPayload,
  options: { stalledAfterMs?: number; now?: Date; isOwner?: boolean } = {},
): Promise<number> {
  const {
    stalledAfterMs = STALLED_JOB_AFTER_MS,
    now = new Date(),
    isOwner = !process.env.PAYLOAD_WORKER,
  } = options;
  if (!isOwner) return 0;

  const cutoff = new Date(now.getTime() - stalledAfterMs).toISOString();
  const stalled = await payload.find({
    collection: JOBS_COLLECTION,
    where: {
      and: [{ processing: { equals: true } }, { updatedAt: { less_than: cutoff } }],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  let released = 0;
  for (const job of stalled.docs) {
    try {
      await payload.update({
        collection: JOBS_COLLECTION,
        id: job.id,
        data: { processing: false },
        depth: 0,
        overrideAccess: true,
      });
      released += 1;
      payload.logger.info(
        { jobId: job.id, taskSlug: job.taskSlug, updatedAt: job.updatedAt },
        '[jobs] Released stalled job left processing by a dead worker',
      );
    } catch (err) {
      payload.logger.error({ err, jobId: job.id }, '[jobs] Failed to release stalled job');
    }
  }
  return released;
}

/**
 * Boot-time sweep plus a periodic re-check for the lifetime of the owner
 * process. The timer is unref'd so it never keeps a one-off script alive.
 */
export function startStalledJobSweep(
  payload: SweepPayload,
  options: { intervalMs?: number; stalledAfterMs?: number; isOwner?: boolean } = {},
): () => void {
  const { intervalMs = STALLED_JOB_SWEEP_INTERVAL_MS, ...sweepOptions } = options;
  const isOwner = sweepOptions.isOwner ?? !process.env.PAYLOAD_WORKER;
  if (!isOwner) return () => {};

  const sweep = () =>
    requeueStalledJobs(payload, { ...sweepOptions, isOwner }).catch((err: unknown) => {
      payload.logger.error({ err }, '[jobs] Stalled job sweep failed');
    });
  void sweep();
  const timer = setInterval(sweep, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
