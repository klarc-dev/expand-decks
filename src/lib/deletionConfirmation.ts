import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { sql } from '@payloadcms/db-postgres';
import type { PostgresAdapter } from '@payloadcms/db-postgres';
import type { Payload, PayloadRequest, TypedUser } from 'payload';
import { z } from 'zod';

import {
  deletionConfirmationPath,
  knowledgeDeletionRequestSchema,
  presentationBuildIdSchema,
} from './deckActionsContract';
import { withPayloadTransaction } from './payloadTransaction';

const TTL_MS = 10 * 60_000;
const NONCE_PREFIX = 'deletion-confirmation:';
const baseTarget = {
  deckId: presentationBuildIdSchema,
  expectedRevision: z.string().min(1).max(128),
};
const targetSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('delete-deck'), ...baseTarget }),
  z.strictObject({
    action: z.literal('delete-slide'),
    ...baseTarget,
    slideId: z.string().min(1).max(128),
  }),
  knowledgeDeletionRequestSchema.extend({
    action: z.literal('delete-knowledge'),
    expectedRevision: baseTarget.expectedRevision,
  }),
]);
type DeletionTarget = z.infer<typeof targetSchema>;
const intentSchema = z.strictObject({
  target: targetSchema,
  actorId: presentationBuildIdSchema,
  requesterSessionHash: z.string().length(43).nullable(),
  expiresAt: z.int().positive(),
  nonce: z.uuid(),
});
type DeletionIntent = z.infer<typeof intentSchema>;

export class DeletionConfirmationError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const sign = (secret: string, purpose: 'intent' | 'session', value: string) =>
  createHmac('sha256', secret)
    .update(`slides:deletion-confirmation:v1:${purpose}:`)
    .update(value)
    .digest('base64url');

function sessionId(user: TypedUser): string | null {
  return '_sid' in user && typeof user._sid === 'string' ? user._sid : null;
}

export function issueDeletionConfirmation({
  payload,
  user,
  target,
}: {
  payload: Payload;
  user: TypedUser;
  target: DeletionTarget;
}) {
  const expiresAt = Date.now() + TTL_MS;
  const sid = sessionId(user);
  const intent = intentSchema.parse({
    target,
    actorId: user.id,
    requesterSessionHash: sid ? sign(payload.secret, 'session', sid) : null,
    expiresAt,
    nonce: randomUUID(),
  });
  const data = Buffer.from(JSON.stringify(intent)).toString('base64url');
  const token = `${data}.${sign(payload.secret, 'intent', data)}`;
  const url = new URL(deletionConfirmationPath, payload.config.serverURL);
  url.searchParams.set('intent', token);
  return { confirmationUrl: url.href, expiresAt: new Date(expiresAt).toISOString() };
}

export function readDeletionConfirmation(secret: string, token: string | null): DeletionIntent {
  const invalid = () =>
    new DeletionConfirmationError(400, 'Lien de confirmation invalide.', 'invalid_confirmation');
  if (!token || token.length > 1_600 || !/^[\w-]+\.[\w-]{43}$/.test(token)) throw invalid();
  const [data, signature] = token.split('.') as [string, string];
  const expected = sign(secret, 'intent', data);
  // Compare canonical encodings so alternate base64 spellings are not accepted.
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw invalid();
  const intent = intentSchema.parse(JSON.parse(Buffer.from(data, 'base64url').toString('utf8')));
  if (Date.now() >= intent.expiresAt) {
    throw new DeletionConfirmationError(
      410,
      'Ce lien de confirmation a expiré.',
      'expired_confirmation',
    );
  }
  return intent;
}

export function assertConfirmationActor(secret: string, intent: DeletionIntent, user: TypedUser) {
  if (user.id !== intent.actorId || user.membershipStatus !== 'active') {
    throw new DeletionConfirmationError(
      403,
      'Connectez-vous avec le compte qui a demandé cette suppression.',
      'forbidden',
    );
  }
  const sid = sessionId(user);
  if (!sid || sign(secret, 'session', sid) === intent.requesterSessionHash) {
    throw new DeletionConfirmationError(
      403,
      'Ouvrez ce lien dans une session Slides distincte de celle qui a demandé la suppression.',
      'browser_session_required',
    );
  }
}

export async function hasUsedDeletionConfirmation(payload: Payload, nonce: string) {
  return payload.kv.has(NONCE_PREFIX + nonce);
}

export async function resolveDeletionConfirmation({
  payload,
  user,
  intent,
  mutate,
}: {
  payload: Payload;
  user: TypedUser;
  intent: DeletionIntent;
  mutate?: (req: PayloadRequest, db: PostgresAdapter['drizzle']) => Promise<void>;
}) {
  assertConfirmationActor(payload.secret, intent, user);
  await withPayloadTransaction(payload, { user }, async (req, db) => {
    // Payload's KV adapter has no conditional insert and does not join the
    // application transaction. Use its provisioned Postgres table so claiming
    // the nonce, cancellation and the destructive action are atomic on all replicas.
    const result = await payload.db.execute({
      db,
      sql: sql`
      INSERT INTO payload_kv ("key", data)
      VALUES (${NONCE_PREFIX + intent.nonce}, ${JSON.stringify({ expiresAt: intent.expiresAt })}::jsonb)
      ON CONFLICT ("key") DO NOTHING RETURNING id
    `,
    });
    if (result.rowCount !== 1) {
      throw new DeletionConfirmationError(
        409,
        'Ce lien a déjà été utilisé ou annulé.',
        'used_confirmation',
      );
    }
    if (Date.now() >= intent.expiresAt) {
      throw new DeletionConfirmationError(
        410,
        'Ce lien de confirmation a expiré.',
        'expired_confirmation',
      );
    }
    if (mutate) await mutate(req, db);

    // Bounded cleanup of expired markers. Valid decisions are never removed.
    await payload.db.execute({
      db,
      sql: sql`
      DELETE FROM payload_kv WHERE id IN (
        SELECT id FROM payload_kv WHERE "key" LIKE 'deletion-confirmation:%'
          AND (data->>'expiresAt')::bigint <= ${Date.now()}
        LIMIT 100 FOR UPDATE SKIP LOCKED
      )
    `,
    });
  });
}
