import type { Payload } from 'payload';

import { COLLECTIONS } from '../collections';
import type { SourceResolutionContext } from './types';

let sourcePayload: Payload | undefined;

/** Register the process-local Payload instance used by the durable workflow. */
export function configureSourceResolutionPayload(payload: Payload): void {
  sourcePayload = payload;
}

/** Resolve stable workflow identity into Payload's access-aware local API context. */
export async function sourceResolutionContextForUser(
  userId: string,
): Promise<SourceResolutionContext> {
  if (!sourcePayload) throw new Error('Source resolution Payload context is not configured');
  const user = await sourcePayload.findByID({
    collection: COLLECTIONS.users,
    id: userId,
    depth: 1,
    overrideAccess: true,
  });
  return {
    payload: sourcePayload,
    user: user as import('payload').PayloadRequest['user'],
  };
}
