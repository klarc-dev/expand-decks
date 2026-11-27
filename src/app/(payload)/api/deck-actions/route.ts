import { APIError } from 'payload';

import { escape } from '@/export/utils';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { deckDeletionRequestSchema, deletionConfirmationPath } from '@/lib/deckActionsContract';
import { deleteConfirmedDeck, getDeletableDeck, prepareDeckDeletion } from '@/lib/deckDeletion';
import { DeckSlidesError, executeDeckSlidesCommand, inspectSlideDeletion } from '@/lib/deckSlides';
import {
  assertConfirmationActor,
  DeletionConfirmationError,
  hasUsedDeletionConfirmation,
  readDeletionConfirmation,
  resolveDeletionConfirmation,
} from '@/lib/deletionConfirmation';
import {
  confirmationContentType,
  confirmationError,
  noStoreConfirmation,
  readConfirmationBody,
  requestDeletionConfirmation,
} from '@/lib/deletionConfirmationRequest';
import { deleteConfirmedKnowledge, inspectKnowledgeDeletion } from '@/lib/knowledgeDeletion';

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${escape(title)}</title></head><body><main><h1>${escape(title)}</h1>${body}</main></body></html>`,
    {
      status,
      headers: {
        ...noStoreConfirmation,
        // Chromium sends Origin: null on a form POST under no-referrer.
        // Send only the origin, never the query containing the signed intent.
        'Referrer-Policy': 'strict-origin',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
  );
}

function actionError(error: unknown) {
  if (error instanceof DeckSlidesError) return error;
  if (error instanceof APIError && [403, 404, 423].includes(error.status)) return error;
  return confirmationError(error);
}

async function authenticateBrowser(request: Request) {
  // Do not fall back to an Authorization header, forwarded identity or dev
  // auto-login. Only the independently authenticated Slides cookie is accepted.
  const headers = new Headers({ DisableAutologin: 'true' });
  for (const key of ['cookie', 'origin', 'sec-fetch-site']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const { payload, user } = await authenticateRequest(headers);
  if (
    request.headers.has('authorization') ||
    (request.method === 'POST' &&
      (request.headers.get('origin') !== new URL(payload.config.serverURL).origin ||
        request.headers.get('sec-fetch-site') !== 'same-origin' ||
        request.headers.get('sec-fetch-mode') !== 'navigate' ||
        request.headers.get('sec-fetch-dest') !== 'document'))
  ) {
    throw new DeletionConfirmationError(
      403,
      'Ouvrez le lien et utilisez le formulaire sur Slides.',
      'browser_required',
    );
  }
  return { payload, user };
}

const loginRequired = () =>
  page(
    'Connexion à Slides requise',
    '<p><a href="/admin">Connectez-vous à Slides</a> avec le compte qui a demandé cette suppression, puis ouvrez de nouveau le lien de confirmation.</p>',
    401,
  );

export async function GET(request: Request) {
  try {
    const { payload, user } = await authenticateBrowser(request);
    if (!user) return loginRequired();
    const tokens = new URL(request.url).searchParams.getAll('intent');
    const token = tokens.length === 1 ? tokens[0] : null;
    const intent = readDeletionConfirmation(payload.secret, token);
    assertConfirmationActor(payload.secret, intent, user);
    if (await hasUsedDeletionConfirmation(payload, intent.nonce)) {
      throw new DeletionConfirmationError(
        409,
        'Ce lien a déjà été utilisé ou annulé.',
        'used_confirmation',
      );
    }
    const { target } = intent;
    const args = { payload, user };
    let summary: string;
    let warning = 'Cette suppression est définitive.';
    if (target.action === 'delete-deck') {
      const { title } = await getDeletableDeck({
        ...args,
        deckId: target.deckId,
        revision: target.expectedRevision,
      });
      summary = `Présentation nº ${target.deckId} : ${title}`;
    } else if (target.action === 'delete-slide') {
      const { title, index } = await inspectSlideDeletion({ ...args, ...target });
      summary = `Diapositive ${index + 1} de « ${title} » (présentation nº ${target.deckId})`;
    } else {
      const { title } = await inspectKnowledgeDeletion({ ...args, ...target });
      const isBase = target.collection === 'knowledge-bases';
      summary = `${isBase ? 'Base de connaissances' : 'Document de connaissance'} nº ${target.id} : ${title}`;
      if (isBase)
        warning =
          'Cette suppression est définitive et supprime aussi tous les documents de cette base.';
    }
    return page(
      'Confirmer la suppression',
      `<p>${escape(summary)}</p>` +
        `<p>${warning} Vérifiez la cible avant de confirmer.</p>` +
        `<form action="${deletionConfirmationPath}" method="post">` +
        `<input type="hidden" name="intent" value="${escape(token)}">` +
        `<button name="decision" value="cancel" type="submit">Annuler</button> ` +
        `<button name="decision" value="approve" type="submit">Supprimer définitivement</button></form>`,
    );
  } catch (error) {
    const { status, message } = actionError(error);
    return page('Confirmation indisponible', `<p>${escape(message)}</p>`, status);
  }
}

async function submitDecision(request: Request) {
  try {
    const { payload, user } = await authenticateBrowser(request);
    if (!user) return loginRequired();
    const form = new URLSearchParams(await readConfirmationBody(request));
    const decision = form.get('decision');
    if (
      (decision !== 'approve' && decision !== 'cancel') ||
      form.getAll('decision').length !== 1 ||
      form.getAll('intent').length !== 1
    ) {
      throw new DeletionConfirmationError(400, 'Décision invalide.', 'invalid_decision');
    }
    const intent = readDeletionConfirmation(payload.secret, form.get('intent'));
    const { target } = intent;
    await resolveDeletionConfirmation({
      payload,
      user,
      intent,
      mutate:
        decision === 'cancel'
          ? undefined
          : async (req, db) => {
              if (target.action === 'delete-deck') {
                await deleteConfirmedDeck({
                  payload,
                  user,
                  deckId: target.deckId,
                  revision: target.expectedRevision,
                  req,
                  db,
                });
              } else if (target.action === 'delete-slide') {
                await executeDeckSlidesCommand({
                  payload,
                  user,
                  req,
                  command: { ...target, action: 'delete' },
                });
              } else {
                await deleteConfirmedKnowledge({ payload, user, ...target, req, db });
              }
            },
    });
    return decision === 'cancel'
      ? page('Suppression annulée', '<p>Aucune modification n’a été effectuée.</p>')
      : page('Suppression effectuée', '<p><a href="/admin">Retour à Slides</a></p>');
  } catch (error) {
    const { status, message } = actionError(error);
    return page('Confirmation indisponible', `<p>${escape(message)}</p>`, status);
  }
}

export function POST(request: Request) {
  if (confirmationContentType(request) === 'application/x-www-form-urlencoded')
    return submitDecision(request);
  return requestDeletionConfirmation(
    request,
    deckDeletionRequestSchema,
    (payload, user, { deckId }) => prepareDeckDeletion(payload, user, deckId),
  );
}
