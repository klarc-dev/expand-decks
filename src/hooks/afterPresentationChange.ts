import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { CTX } from '../lib/context';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { BUILD_STATUS } from '../lib/status';
import { patchPresentationBuildMetadata } from '../jobs/patchPresentationBuildMetadata';
import {
  MEDIA_PRODUCER_RESULT_SCHEMA,
  MEDIA_PRODUCER_STATUS,
  terminalMediaProducerResult,
} from '../lib/mediaProducer';

export { buildFingerprint, buildInputsChanged } from '../lib/buildFingerprint';

export const afterPresentationChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  // Skip if explicitly flagged (builder patching back results)
  if (req.context?.[CTX.skipBuildQueue]) return doc;
  // Producer requests own their token + queue input because those carry the
  // publication/revision binding that a generic presentation save does not.
  if (req.context?.[CTX.mediaProducerRequest]) return doc;

  // Queue on every create/update save. Internal build/AI patches set skipBuildQueue
  // above so artifact/status writes do not recurse into an infinite rebuild loop.
  if (operation !== 'create' && operation !== 'update') return doc;

  const currentRequest = (doc as { currentMediaProductionRequest?: unknown })
    .currentMediaProductionRequest;
  const currentRequestId =
    currentRequest && typeof currentRequest === 'object'
      ? (currentRequest as { id?: unknown }).id
      : currentRequest;
  if (operation === 'update' && currentRequestId) {
    const record = await req.payload.findByID({
      collection: COLLECTIONS.mediaProductionRequests,
      id: currentRequestId as string | number,
      depth: 0,
      overrideAccess: true,
    });
    const existingResult = MEDIA_PRODUCER_RESULT_SCHEMA.safeParse(record.result);
    if (existingResult.success) {
      const result = terminalMediaProducerResult(
        {
          request_id: existingResult.data.request_id,
          publication_id: existingResult.data.publication_id,
          revision_sha256: existingResult.data.revision_sha256,
          presentation_id: doc.id as string | number,
        },
        MEDIA_PRODUCER_STATUS.stale,
        'presentation_changed',
        'La présentation a changé après cette demande média.',
      );
      await req.payload.update({
        collection: COLLECTIONS.mediaProductionRequests,
        id: currentRequestId as string | number,
        data: { status: MEDIA_PRODUCER_STATUS.stale, result },
        overrideAccess: true,
        depth: 0,
      });
    }
  }

  const buildToken = randomUUID();
  await patchPresentationBuildMetadata(
    req.payload,
    doc.id as string,
    {
      lastBuildToken: buildToken,
      lastBuildRequestedAt: new Date().toISOString(),
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
      spaUrl: null,
      pdfFile: null,
      coverImage: null,
      ...(currentRequestId ? { currentMediaProductionRequest: null } : {}),
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
