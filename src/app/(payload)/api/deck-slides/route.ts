import { NextResponse, type NextRequest } from 'next/server';

import { userIsOrganisationMember } from '@/access/roles';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';
import { slideMutationSchema } from '@/lib/deckCrudContract';
import { replaceSlideAt } from '@/lib/replaceSlideAt';
import type { Presentation } from '@/payload-types';

export async function GET(req: NextRequest) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const searchParams = new URL(req.url).searchParams;
  const deckId = searchParams.get('deckId');
  const slideIndex = searchParams.get('slideIndex');
  if (!deckId) return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: deckId,
    user,
    overrideAccess: false,
    disableErrors: true,
    depth: 0,
  });
  if (!presentation)
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });

  const slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  if (slideIndex === null) return NextResponse.json({ deckId: presentation.id, slides });
  const slide = slides[Number(slideIndex)];
  return slide
    ? NextResponse.json({ deckId: presentation.id, slideIndex: Number(slideIndex), slide })
    : NextResponse.json({ error: 'Diapositive introuvable' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = slideMutationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const { deckId } = parsed.data;
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: deckId,
    user,
    overrideAccess: false,
    disableErrors: true,
    depth: 0,
  });
  if (!presentation)
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });

  if (!userIsOrganisationMember(user, presentation.organisation))
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const slides = [...(Array.isArray(presentation.slides) ? presentation.slides : [])];
  const command = parsed.data;
  if (command.action === 'create') {
    slides.splice(
      Math.min(command.index ?? slides.length, slides.length),
      0,
      command.slide as never,
    );
  } else if (command.action === 'update') {
    try {
      return NextResponse.json(
        await updateSlides(
          payload,
          user,
          deckId,
          replaceSlideAt(
            slides as Array<Record<string, unknown>>,
            command.slideIndex,
            command.slide,
          ),
        ),
      );
    } catch {
      return NextResponse.json({ error: 'Diapositive introuvable' }, { status: 404 });
    }
  } else {
    const current = slides[command.slideIndex];
    if (!current) return NextResponse.json({ error: 'Diapositive introuvable' }, { status: 404 });
    slides.splice(command.slideIndex, 1);
    if (command.action === 'move')
      slides.splice(Math.min(command.toIndex, slides.length), 0, current);
  }

  return NextResponse.json(await updateSlides(payload, user, deckId, slides));
}

async function updateSlides(
  payload: Awaited<ReturnType<typeof authenticateRequest>>['payload'],
  user: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>['user']>,
  deckId: string | number,
  slides: Array<Record<string, unknown>> | Presentation['slides'],
) {
  const updated = await payload.update({
    collection: COLLECTIONS.presentations,
    id: deckId,
    data: { slides: slides as Presentation['slides'] },
    user,
    depth: 0,
  });
  return { deckId: updated.id, slides: updated.slides ?? [] };
}
