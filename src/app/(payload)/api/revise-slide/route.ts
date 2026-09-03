import { NextResponse, type NextRequest } from 'next/server';
import { userIsOrganisationMember } from '@/access/roles';
import { reviseSlide } from '@/agents/reviseSlide';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';
import { currentSlideContext } from '@/lib/currentDeckContext';
import { slideRevisionSchema } from '@/lib/deckCrudContract';
import { replaceSlideAt } from '@/lib/replaceSlideAt';
import { convertSlidesMarkdownToLexical } from '@/lib/richTextWrite';
import type { Presentation } from '@/payload-types';

export async function POST(req: NextRequest) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = slideRevisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const { presentationId, slideIndex, instruction } = parsed.data;
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    user,
    overrideAccess: false,
    disableErrors: true,
    depth: 0,
  });
  if (!presentation) {
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  }

  if (!userIsOrganisationMember(user, presentation.organisation)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  const current = slides[slideIndex];
  if (!current) return NextResponse.json({ error: 'Diapositive introuvable' }, { status: 404 });

  try {
    const readable = JSON.parse(
      await currentSlideContext(current as unknown as Record<string, unknown>, payload),
    ) as Record<string, unknown>;
    const revised = await reviseSlide({
      instruction,
      language: presentation.language,
      slide: readable,
    });
    const [revisedRich] = await convertSlidesMarkdownToLexical([revised], payload);
    if (!revisedRich) {
      throw new Error('La révision IA n’a produit aucune diapositive');
    }
    const nextSlides = replaceSlideAt(
      slides as Array<Record<string, unknown>>,
      slideIndex,
      revisedRich,
    ) as Presentation['slides'];

    const updated = await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { slides: nextSlides },
      user,
      depth: 0,
    });

    return NextResponse.json({ slide: updated.slides?.[slideIndex], slideIndex });
  } catch (error) {
    console.error('[revise-slide] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Révision impossible' },
      { status: 422 },
    );
  }
}
