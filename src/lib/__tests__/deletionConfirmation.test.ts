import type { Payload, TypedUser } from 'payload';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  deckDeletionRequestSchema,
  destructiveConfirmationResponseSchema,
  knowledgeDeletionRequestSchema,
  presentationBuildResponseSchema,
} from '../deckActionsContract';
import {
  assertConfirmationActor,
  issueDeletionConfirmation,
  readDeletionConfirmation,
} from '../deletionConfirmation';

const payload = {
  secret: 'test-secret',
  config: { serverURL: 'https://slides.example' },
} as Payload;
const user = (id: number, sid: string) =>
  ({ id, _sid: sid, membershipStatus: 'active' }) as TypedUser;
const actor = user(5, 'connector-session');
const browserActor = user(5, 'browser-session');
const target = {
  action: 'delete-slide' as const,
  deckId: 12,
  expectedRevision: 'content-revision',
  slideId: 'stable-block',
};

function issue() {
  const response = issueDeletionConfirmation({ payload, user: actor, target });
  const token = new URL(response.confirmationUrl).searchParams.get('intent')!;
  return { response, token };
}

describe('pure authoring action contracts', () => {
  it('rejects extra confirmation properties and disallows arbitrary knowledge collections', () => {
    expect(deckDeletionRequestSchema.safeParse({ deckId: 12, confirmed: true }).success).toBe(
      false,
    );
    expect(deckDeletionRequestSchema.safeParse({ deckId: 0 }).success).toBe(false);
    expect(knowledgeDeletionRequestSchema.safeParse({ collection: 'users', id: 12 }).success).toBe(
      false,
    );
    expect(
      knowledgeDeletionRequestSchema.parse({ collection: 'knowledge-documents', id: 12 }),
    ).toEqual({ collection: 'knowledge-documents', id: 12 });
  });

  it('contracts native queue admission separately from export success', () => {
    const pending = {
      queued: true,
      buildToken: '3de2a09b-efb7-4d8d-9a8e-a5c1af81b9d9',
      lastBuildStatus: 'building',
      lastBuildRequestedAt: '2026-11-27T12:00:00.000Z',
    };
    expect(presentationBuildResponseSchema.safeParse(pending).success).toBe(true);
    expect(
      presentationBuildResponseSchema.safeParse({ ...pending, lastBuildStatus: 'success' }).success,
    ).toBe(false);
  });
});

describe('signed destructive confirmation', () => {
  afterEach(() => vi.useRealTimers());

  it('binds the link to the exact operation, revision, and same identity in an independent session', () => {
    const { response, token } = issue();
    expect(destructiveConfirmationResponseSchema.safeParse(response).success).toBe(true);
    expect(new URL(response.confirmationUrl).origin).toBe('https://slides.example');
    expect(new URL(response.confirmationUrl).pathname).toBe('/api/deck-actions');
    const intent = readDeletionConfirmation(payload.secret, token);
    expect(intent.target).toEqual(target);
    expect(() => assertConfirmationActor(payload.secret, intent, browserActor)).not.toThrow();
    expect(() => assertConfirmationActor(payload.secret, intent, actor)).toThrow(
      expect.objectContaining({ code: 'browser_session_required' }),
    );
    expect(() =>
      assertConfirmationActor(payload.secret, intent, user(6, 'browser-session')),
    ).toThrow(expect.objectContaining({ code: 'forbidden' }));
    expect(JSON.stringify(intent)).not.toContain('connector-session');
  });

  it('rejects malformed, tampered, and expired confirmations', () => {
    vi.useFakeTimers();
    const { token } = issue();
    const tampered = `${token[0] === 'a' ? 'b' : 'a'}${token.slice(1)}`;
    expect(() => readDeletionConfirmation(payload.secret, tampered)).toThrow(
      expect.objectContaining({ status: 400 }),
    );
    expect(() => readDeletionConfirmation(payload.secret, 'not-a-token')).toThrow(
      expect.objectContaining({ status: 400 }),
    );
    vi.advanceTimersByTime(10 * 60_000);
    expect(() => readDeletionConfirmation(payload.secret, token)).toThrow(
      expect.objectContaining({ status: 410 }),
    );
  });
});
