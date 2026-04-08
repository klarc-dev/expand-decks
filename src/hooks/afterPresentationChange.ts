import { createHash } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

function slidesHash(slides: unknown): string {
  return createHash('sha256').update(JSON.stringify(slides ?? [])).digest('hex');
}

/**
 * Only differences in non-builder fields matter.
 * Returns true when the slides content has changed between previous and current doc.
 */
function slidesContentChanged(
  doc: Record<string, unknown>,
  previousDoc: Record<string, unknown>,
): boolean {
  return slidesHash(doc.slides) !== slidesHash(previousDoc.slides);
}

export const afterPresentationChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  // Skip if explicitly flagged (builder patching back results)
  if (req.context?.skipBuildQueue) return doc;

  // Only queue on create/update when status is published
  if (operation !== 'create' && operation !== 'update') return doc;
  if (doc.status !== 'published') return doc;

  // On update: only queue if it's a fresh publish or slides content changed
  if (operation === 'update' && previousDoc) {
    const wasPublished = previousDoc.status === 'published';
    const contentChanged = slidesContentChanged(doc, previousDoc);

    // Already published and slides haven't changed — skip
    if (wasPublished && !contentChanged) return doc;
  }

  // Cast needed until `payload generate:types` adds buildSlides to TypedJobs
  await (req.payload.jobs.queue as Function)({
    task: 'buildSlides',
    input: { presentationId: doc.id as string },
    req,
  });

  return doc;
};
