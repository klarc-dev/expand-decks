import { authenticateRequest } from '@/lib/authenticateRequest';
import {
  DeckSlidesError,
  executeDeckSlidesCommand,
  inspectSlideDeletion,
  readDeckSlides,
} from '@/lib/deckSlides';
import { deckSlidesPostSchema, parseReadDeckSlidesQuery } from '@/lib/deckSlidesContract';
import { issueDeletionConfirmation } from '@/lib/deletionConfirmation';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'private, no-store' };

function authenticate(request: Request) {
  const headers = new Headers(request.headers);
  headers.set('DisableAutologin', 'true');
  return authenticateRequest(headers);
}

function slideError(error: unknown): Response {
  if (error instanceof DeckSlidesError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: noStore },
    );
  }
  throw error;
}

export async function GET(request: Request) {
  const { payload, user } = await authenticate(request);
  if (!user) return Response.json({ error: 'Non authentifié.' }, { status: 401, headers: noStore });
  const query = parseReadDeckSlidesQuery(new URL(request.url).searchParams);
  if (!query) {
    return Response.json(
      { error: 'Requête invalide.', code: 'invalid_request' },
      { status: 400, headers: noStore },
    );
  }
  try {
    return Response.json(await readDeckSlides({ payload, user, ...query }), {
      headers: noStore,
    });
  } catch (error) {
    return slideError(error);
  }
}

export async function POST(request: Request) {
  const { payload, user } = await authenticate(request);
  if (!user) return Response.json({ error: 'Non authentifié.' }, { status: 401, headers: noStore });
  const parsed = deckSlidesPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: 'Requête invalide.', code: 'invalid_request', issues: parsed.error.issues },
      { status: 400, headers: noStore },
    );
  }
  const command = parsed.data;
  try {
    if (command.action === 'list' || command.action === 'get') {
      return Response.json(await readDeckSlides({ payload, user, ...command }), {
        headers: noStore,
      });
    }
    if (command.action === 'prepare-delete') {
      const { deckId, slideId, expectedRevision } = command;
      await inspectSlideDeletion({ payload, user, deckId, slideId, expectedRevision });
      return Response.json(
        issueDeletionConfirmation({
          payload,
          user,
          target: { action: 'delete-slide', deckId, slideId, expectedRevision },
        }),
        { headers: noStore },
      );
    }
    return Response.json(await executeDeckSlidesCommand({ payload, user, command }), {
      headers: noStore,
    });
  } catch (error) {
    return slideError(error);
  }
}
