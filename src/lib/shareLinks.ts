import { createHash } from 'node:crypto';

import type { Payload } from 'payload';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function isLive(link: { expiresAt: string | Date }): boolean {
  return new Date(link.expiresAt) >= new Date();
}

export async function resolveShareLink(payload: Payload, token: string, depth = 0) {
  const { docs } = await payload.find({
    collection: 'share-links',
    where: { tokenHash: { equals: sha256(token) } },
    limit: 1,
    overrideAccess: true,
    depth,
  });
  return docs[0] ?? null;
}
