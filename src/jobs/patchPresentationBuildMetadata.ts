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
  });
}
