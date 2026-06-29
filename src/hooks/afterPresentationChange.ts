import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { PRESENTATION_STATUS } from '../lib/status';
import { CTX } from '../lib/context';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { buildInputsChanged } from '../lib/buildFingerprint';

export { buildFingerprint, buildInputsChanged } from '../lib/buildFingerprint';

export const afterPresentationChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  // Skip if explicitly flagged (builder patching back results)
  if (req.context?.[CTX.skipBuildQueue]) return doc;

  // Only queue on create/update when status is published
  if (operation !== 'create' && operation !== 'update') return doc;
  if (doc.status !== PRESENTATION_STATUS.published) return doc;

  // On update: only queue if it's a fresh publish or slides content changed
  if (operation === 'update' && previousDoc) {
    const wasPublished = previousDoc.status === PRESENTATION_STATUS.published;
    const contentChanged = buildInputsChanged(doc, previousDoc);

    // Already published and no build-affecting input changed — skip
    if (wasPublished && !contentChanged) return doc;
  }

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
