import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { CTX } from '../lib/context';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { BUILD_STATUS } from '../lib/status';
import { DEFAULT_OUTPUT_POLICY } from '../lib/outputPolicy';

export { buildFingerprint, buildInputsChanged } from '../lib/buildFingerprint';

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
  await req.payload.update({
    collection: COLLECTIONS.presentations,
    id: doc.id as string,
    data: {
      lastBuildToken: buildToken,
      lastBuildRequestedAt: new Date().toISOString(),
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
    },
    context: { [CTX.skipBuildQueue]: true },
  });

  // Cast needed until `payload generate:types` adds buildSlides to TypedJobs
  await (req.payload.jobs.queue as Function)({
    task: BUILD_SLIDES_TASK,
    input: { presentationId: doc.id as string, buildToken, outputPolicy: DEFAULT_OUTPUT_POLICY },
    req,
  });

  // Kick the queue immediately instead of waiting up to 60s for the next autoRun
  // cron tick — this is the dominant component of perceived build latency. The
  // app runs as a persistent server (not serverless), so a fire-and-forget run
  // survives past this response. Deliberately NOT awaited so the save returns
  // promptly, and errors are swallowed: a transient run failure must never fail
  // the user's save. A concurrent autoRun tick is safe — Payload locks jobs while
  // processing and the build runner skips stale buildTokens.
  // Promise.resolve().then(...) so a *synchronous* throw inside run() is funneled
  // into .catch too — it must never escape and fail the user's save.
  void Promise.resolve()
    .then(() => (req.payload.jobs.run as Function)())
    .catch((err: unknown) => {
      req.payload.logger?.warn?.(
        { err },
        'on-demand jobs.run after presentation change failed; autoRun will retry',
      );
    });

  return doc;
};
