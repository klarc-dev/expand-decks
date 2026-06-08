import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Presentation } from '@/payload-types';
import { TypeValidationError } from 'ai';
import { z } from 'zod';

import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { draftPresentationSlides } from '@/lib/draftPresentation';
import { ROLES } from '@/access/roles';

const requestSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(8000),
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
      return NextResponse.json(
        { error: 'presentationId et brief sont requis' },
        { status: 400 },
      );
    }
    const { presentationId, brief } = parsed.data;

    // Verify the presentation exists and user has access
    const presentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      user,
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

    // Shared LLM-only surface: derives the schema + system prompt from the
    // block-spec SSOT and tool-calls the gateway (see src/lib/ai.ts). It does
    // NOT persist — this route owns the Payload write below.
    const { slides } = await draftPresentationSlides(brief);

    // slides is the Zod-validated union array (min 3); cast only at the Payload
    // write boundary to the generated Presentation['slides'] shape.
    const slideCount = slides.length;

    // Write blocks to the presentation
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { slides: slides as Presentation['slides'] },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });

    return NextResponse.json({
      success: true,
      slideCount,
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
          error:
            'La génération a produit un format inattendu. Simplifiez le brief et réessayez.',
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
