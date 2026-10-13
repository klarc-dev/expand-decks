import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { CTX } from '../lib/context';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { BUILD_STATUS } from '../lib/status';
import { patchPresentationBuildMetadata } from '../jobs/patchPresentationBuildMetadata';

export const afterPresentationChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  // Skip if explicitly flagged (builder patching back results)
  if (req.context?.[CTX.skipBuildQueue]) return doc;
  // Queue on every create/update save. Internal build/AI patches set skipBuildQueue
  // above so artifact/status writes do not recurse into an infinite rebuild loop.
  if (operation !== 'create' && operation !== 'update') return doc;

  const buildToken = randomUUID();
  await patchPresentationBuildMetadata(
    req.payload,
    doc.id as string,
    {
      lastBuildToken: buildToken,
      lastBuildRequestedAt: new Date().toISOString(),
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
    },
    req,
  );

  // Cast needed until `payload generate:types` adds buildSlides to TypedJobs
  await (req.payload.jobs.queue as Function)({
    task: BUILD_SLIDES_TASK,
    input: { presentationId: doc.id as string, buildToken },
    req,
  });

  // Kick the queue immediately instead of waiting up to 60s for the next autoRun
  // cron tick — this is the dominant component of perceived build latency.
  // Deliberately NOT awaited so the save returns promptly, and errors are
  // swallowed: a transient run failure must never fail the user's save. A
  // concurrent autoRun tick is safe — Payload locks jobs while processing and
  // the build runner skips stale buildTokens.
  // Promise.resolve().then(...) so a *synchronous* throw inside run() is funneled
  // into .catch too — it must never escape and fail the user's save.
  //
  // Only a long-lived server may do this. A one-off script (seed, migration,
  // `pnpm prod run`) saving a presentation exits as soon as its own work is
  // done; Payload has by then claimed the job (`processing: true`) and the
  // process dies mid-build, leaving the deck's concurrency key locked for 30
  // minutes until the stalled-job sweep releases it. Reproduced locally: a
  // script save left job 2677 at processing=true, tried=0.
  if (canRunJobsInProcess()) {
    void Promise.resolve()
      .then(() => (req.payload.jobs.run as Function)())
      .catch((err: unknown) => {
        req.payload.logger?.warn?.(
          { err },
          'on-demand jobs.run after presentation change failed; autoRun will retry',
        );
      });
  }

  return doc;
};

/**
 * True when this process stays alive long enough to finish a Slidev build:
 * the Next.js server (which also owns the autoRun cron) or a Payload worker.
 * Scripts and tests leave the queued job to the worker's cron.
 *
 * `process.env.NEXT_RUNTIME` is a build-time define: Next inlines the literal
 * 'nodejs' into server bundles and leaves it undefined for tsx scripts, so it
 * must be read as this exact expression, never through a passed-in env object.
 */
export function canRunJobsInProcess(
  override: string | undefined = process.env.PAYLOAD_RUN_JOBS_IN_PROCESS,
): boolean {
  if (override === '0') return false;
  if (override === '1') return true;
  return process.env.NEXT_RUNTIME === 'nodejs' || Boolean(process.env.PAYLOAD_WORKER);
}
