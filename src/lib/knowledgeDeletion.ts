import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import type { Payload, PayloadRequest, TypedUser } from 'payload';
import type { z } from 'zod';

import { userIsAdminOrAuthor } from '@/access/roles';

import type { knowledgeDeletionRequestSchema } from './deckActionsContract';
import { DeletionConfirmationError, issueDeletionConfirmation } from './deletionConfirmation';

type KnowledgeTarget = z.infer<typeof knowledgeDeletionRequestSchema>;
type KnowledgeAction = KnowledgeTarget & {
  payload: Payload;
  user: TypedUser;
  expectedRevision?: string;
  req?: PayloadRequest;
};

export async function inspectKnowledgeDeletion({
  payload,
  user,
  collection,
  id,
  expectedRevision,
  req,
}: KnowledgeAction) {
  // Both collections' native delete policies add the author/admin role to
  // their read scope. The actual delete also runs with native access checks.
  if (!userIsAdminOrAuthor(user) || user.membershipStatus !== 'active') {
    throw new DeletionConfirmationError(403, 'Accès refusé.', 'forbidden');
  }
  const doc = await payload.findByID({
    collection,
    id,
    req,
    user,
    overrideAccess: false,
    disableErrors: true,
    depth: 0,
  });
  if (!doc) throw new DeletionConfirmationError(404, 'Ressource introuvable.', 'not_found');
  if (expectedRevision !== undefined && doc.updatedAt !== expectedRevision) {
    throw new DeletionConfirmationError(
      409,
      'La ressource a été modifiée. Demandez un nouveau lien.',
      'stale',
    );
  }
  return {
    title: 'name' in doc ? doc.name : (doc.filename ?? `Document nº ${id}`),
    revision: doc.updatedAt,
  };
}

export async function prepareKnowledgeDeletion(args: KnowledgeAction) {
  const { payload, user, collection, id } = args;
  const { revision } = await inspectKnowledgeDeletion(args);
  return issueDeletionConfirmation({
    payload,
    user,
    target: { action: 'delete-knowledge', collection, id, expectedRevision: revision },
  });
}

export async function deleteConfirmedKnowledge(
  args: KnowledgeAction & {
    db: PostgresAdapter['drizzle'];
    req: PayloadRequest;
    expectedRevision: string;
  },
) {
  const { payload, user, collection, id, db, req } = args;
  const lock =
    collection === 'knowledge-bases'
      ? sql`SELECT id FROM knowledge_bases WHERE id = ${id} FOR UPDATE`
      : sql`SELECT id FROM knowledge_documents WHERE id = ${id} FOR UPDATE`;
  await payload.db.execute({ db, sql: lock });
  await inspectKnowledgeDeletion(args);
  await payload.delete({
    collection,
    id,
    req,
    user,
    depth: 0,
    overrideAccess: false,
    overrideLock: false,
  });
}
