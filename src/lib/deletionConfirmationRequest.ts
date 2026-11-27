import type { Payload, TypedUser } from 'payload';
import type { z } from 'zod';

import { authenticateRequest } from './authenticateRequest';
import { DeletionConfirmationError } from './deletionConfirmation';
import { PayloadTransactionUnavailable } from './payloadTransaction';

export const noStoreConfirmation = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

export function confirmationError(error: unknown) {
  if (error instanceof DeletionConfirmationError) return error;
  return {
    status: error instanceof PayloadTransactionUnavailable ? 503 : 500,
    code: 'outcome_unconfirmed',
    message: 'Résultat non confirmé. Vérifiez la cible dans Slides avant toute nouvelle demande.',
  };
}

export async function readConfirmationBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.length;
      if (bytes > 4096) {
        await reader.cancel();
        throw new DeletionConfirmationError(413, 'Requête trop volumineuse.', 'request_too_large');
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export const confirmationContentType = (request: Request) =>
  request.headers.get('content-type')?.split(';', 1)[0]?.trim();

export async function requestDeletionConfirmation<T>(
  request: Request,
  schema: z.ZodType<T>,
  prepare: (
    payload: Payload,
    user: TypedUser,
    input: T,
  ) => Promise<{ confirmationUrl: string; expiresAt: string }>,
) {
  const headers = noStoreConfirmation;
  if (confirmationContentType(request) !== 'application/json') {
    return Response.json(
      { error: 'Format de requête non pris en charge' },
      { status: 415, headers },
    );
  }
  try {
    const authHeaders = new Headers(request.headers);
    authHeaders.set('DisableAutologin', 'true');
    const { payload, user } = await authenticateRequest(authHeaders);
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401, headers });
    const text = await readConfirmationBody(request);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const input = schema.safeParse(body);
    if (!input.success) return Response.json({ error: 'Cible invalide' }, { status: 400, headers });
    return Response.json(await prepare(payload, user, input.data), { headers });
  } catch (error) {
    const { status, code, message } = confirmationError(error);
    return Response.json({ code, error: message }, { status, headers });
  }
}
