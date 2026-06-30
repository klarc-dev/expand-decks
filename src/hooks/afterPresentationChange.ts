import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { CTX } from '../lib/context';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';

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
    data: { lastBuildToken: buildToken },
    context: { [CTX.skipBuildQueue]: true },
  });

  // Cast needed until `payload generate:types` adds buildSlides to TypedJobs
  await (req.payload.jobs.queue as Function)({
    task: BUILD_SLIDES_TASK,
    input: { presentationId: doc.id as string, buildToken },
    req,
  });

  return doc;
};
