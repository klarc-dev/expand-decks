import type { Payload, PayloadRequest } from 'payload';

import { COLLECTIONS } from '../lib/collections';

/**
 * Build metadata is operational state, not an author edit. Patch it below the
 * collection-operation layer so Payload does not advance `updatedAt` and show
 * an active author the destructive stale-document dialog.
 */
export async function patchPresentationBuildMetadata(
  payload: Pick<Payload, 'db'>,
  presentationId: number | string,
  data: Record<string, unknown>,
  req?: Partial<PayloadRequest>,
) {
  return payload.db.updateOne({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    // Payload's Drizzle adapter treats an explicit null updatedAt as "do not
    // touch this timestamp" while still writing the other supplied fields.
    data: { ...data, updatedAt: null },
    req,
    returning: false,
  });
}

/**
 * Array fields cannot be partially written through Payload's Drizzle
 * `updateOne`: the adapter falls back to an INSERT ... ON CONFLICT statement
 * containing defaults for required presentation columns. Use the collection
 * operation for the artifact array, suppress the build hook, then restore the
 * author's timestamp with the safe scalar path above.
 */
export async function patchPresentationBuildArtifacts(
  payload: Pick<Payload, 'db' | 'update'>,
  presentationId: number | string,
  data: Record<string, unknown>,
  authoredUpdatedAt: unknown,
) {
  await payload.update({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    data,
    depth: 0,
    overrideAccess: true,
    overrideLock: true,
    context: { skipBuildQueue: true },
  });

  if (typeof authoredUpdatedAt === 'string' && authoredUpdatedAt) {
    await payload.db.updateOne({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { updatedAt: authoredUpdatedAt },
      returning: false,
    });
  }
}
