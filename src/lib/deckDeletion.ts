import { sql } from '@payloadcms/db-postgres';
import type { PostgresAdapter } from '@payloadcms/db-postgres';
import type { Payload, PayloadRequest, TypedUser } from 'payload';

import { userIsAdmin } from '@/access/roles';
import { COLLECTIONS } from './collections';
import { DeletionConfirmationError, issueDeletionConfirmation } from './deletionConfirmation';

export async function getDeletableDeck({
  payload,
  user,
  deckId,
  revision,
  req,
}: {
  payload: Payload;
  user: TypedUser;
  deckId: number;
  revision?: string;
  req?: PayloadRequest;
}) {
  if (!userIsAdmin(user) || user.membershipStatus !== 'active') {
    throw new DeletionConfirmationError(
      403,
      'Seul un administrateur peut supprimer une présentation.',
      'forbidden',
    );
  }
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: deckId,
    depth: 0,
    overrideAccess: false,
    disableErrors: true,
    select: { title: true, updatedAt: true },
    user,
    req,
  });
  if (!presentation) {
    throw new DeletionConfirmationError(404, 'Présentation introuvable.', 'not_found');
  }
  if (revision !== undefined && presentation.updatedAt !== revision) {
    throw new DeletionConfirmationError(
      409,
      'La présentation a été modifiée. Demandez un nouveau lien.',
      'stale',
    );
  }
  return presentation;
}

export async function prepareDeckDeletion(payload: Payload, user: TypedUser, deckId: number) {
  const deck = await getDeletableDeck({ payload, user, deckId });
  return issueDeletionConfirmation({
    payload,
    user,
    target: { action: 'delete-deck', deckId, expectedRevision: deck.updatedAt },
  });
}

export async function deleteConfirmedDeck({
  payload,
  user,
  deckId,
  revision,
  req,
  db,
}: {
  payload: Payload;
  user: TypedUser;
  deckId: number;
  revision: string;
  req: PayloadRequest;
  db: PostgresAdapter['drizzle'];
}) {
  await payload.db.execute({
    db,
    sql: sql`SELECT id FROM presentations WHERE id = ${deckId} FOR UPDATE`,
  });
  await getDeletableDeck({ payload, user, deckId, revision, req });
  await payload.delete({
    collection: COLLECTIONS.presentations,
    id: deckId,
    depth: 0,
    overrideAccess: false,
    overrideLock: false,
    user,
    req,
  });
}
