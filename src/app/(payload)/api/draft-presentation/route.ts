import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Presentation } from '@/payload-types';
import { TypeValidationError } from 'ai';
import { z } from 'zod';

import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { deckContext } from '@/lib/deckContext';
import { mergeAugmentedSlides } from '@/lib/augmentSlides';
import { draftPresentationSlides } from '@/lib/draftPresentation';
import { convertSlidesMarkdownToLexical } from '@/lib/richTextWrite';
import { ROLES } from '@/access/roles';

const requestSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(20000),
  // 'replace' (default) overwrites the deck wholesale — current behaviour.
  // 'augment' appends the newly-drafted slides to the existing deck, keeping
  // every existing slide byte-for-byte (never re-drafted, never re-converted).
  mode: z.enum(['replace', 'augment']).default('replace'),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });

    // Authenticate the user via Payload
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'presentationId et brief sont requis' }, { status: 400 });
    }
    const { presentationId, brief, mode } = parsed.data;

    // Verify the presentation exists and user has access. disableErrors makes a
    // missing/inaccessible id return null instead of throwing NotFound (which
    // would otherwise fall through to the generic 500 handler).
    const presentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      user,
      disableErrors: true,
    });

    if (!presentation) {
      return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
    }

    // Authorize the WRITE before spending LLM tokens: only an admin or the
    // presentation owner may draft into it (read access alone is broader).
    const createdById =
      typeof presentation.createdBy === 'object'
        ? presentation.createdBy?.id
        : presentation.createdBy;
    if (user.role !== ROLES.admin && createdById !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // LLM-only: draftPresentationSlides does NOT persist; this route owns the
    // Payload write below. Prepend the deck's metadata so output is deck-aware.
    const { slides } = await draftPresentationSlides(deckContext(presentation) + brief);
    const newSlideCount = slides.length;

    // The LLM emits long fields as markdown strings; convert ONLY the freshly
    // drafted slides to Lexical editor state. In augment mode the existing
    // slides are already Lexical and are kept verbatim (never re-converted).
    const draftedRich = await convertSlidesMarkdownToLexical(slides, payload);

    // In augment mode, append to the existing deck, preserving every existing
    // slide by reference. In replace mode, overwrite wholesale (default).
    const existing = (
      mode === 'augment' && Array.isArray(presentation.slides) ? presentation.slides : []
    ) as NonNullable<Presentation['slides']>;
    const nextSlides = mergeAugmentedSlides(existing, draftedRich) as Presentation['slides'];

    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { slides: nextSlides },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });

    return NextResponse.json({
      success: true,
      // Slides added this call; in augment mode the deck total is larger.
      slideCount: newSlideCount,
      mode,
    });
  } catch (error) {
    // Never return raw provider errors to the client — they can leak base URLs,
    // model names, and config hints. Log server-side; send a stable message.
    if (TypeValidationError.isInstance(error)) {
      console.error('[draft-presentation] invalid model output', {
        cause: error.cause instanceof Error ? error.cause.message : undefined,
      });
      return NextResponse.json(
        {
          error: 'La génération a produit un format inattendu. Simplifiez le brief et réessayez.',
        },
        { status: 422 },
      );
    }
    console.error('[draft-presentation] generation failed', error);
    return NextResponse.json(
      {
        error:
          'La génération a échoué : le service IA est indisponible ou mal configuré. Réessayez plus tard ou contactez un administrateur.',
      },
      { status: 500 },
    );
  }
}
