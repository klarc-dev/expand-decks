import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@payloadcms/db-postgres';
import { userIsAdminOrAuthor, userIsOrganisationMember } from '@/access/roles';
import { reviseSlide } from '@/agents/reviseSlide';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';
import { currentSlideContext } from '@/lib/currentDeckContext';
import { deckSlidesRevision } from '@/lib/deckSlidesContract';
import { PayloadTransactionUnavailable, withPayloadTransaction } from '@/lib/payloadTransaction';
import { slideRevisionSchema } from '@/lib/slideRevisionContract';
import { replaceSlideAt } from '@/lib/replaceSlideAt';
import { convertSlidesMarkdownToLexical } from '@/lib/richTextWrite';
import { resolveDocumentTemplate } from '@/documents/templates';
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
  if (!userIsAdminOrAuthor(user)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const slides = Array.isArray(presentation.slides) ? presentation.slides : [];
  const current = slides[slideIndex];
  if (!current) return NextResponse.json({ error: 'Diapositive introuvable' }, { status: 404 });
  const template = resolveDocumentTemplate(presentation.documentTemplate);
  const revision = deckSlidesRevision(slides, template.id);

  try {
    const readable = JSON.parse(
      await currentSlideContext(current as unknown as Record<string, unknown>, payload),
    ) as Record<string, unknown>;
    const revised = await reviseSlide({
      instruction,
      language: presentation.language,
      slide: readable,
      template,
    });
    const [revisedRich] = await convertSlidesMarkdownToLexical([revised], payload);
    if (!revisedRich) {
      throw new Error('La révision IA n’a produit aucune diapositive');
    }
    const updated = await withPayloadTransaction(payload, { user }, async (req, db) => {
      await payload.db.execute({
        db,
        sql: sql`SELECT id FROM presentations WHERE id = ${presentation.id} FOR UPDATE`,
      });
      const latest = await payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentation.id,
        req,
        overrideAccess: false,
        disableErrors: true,
        depth: 0,
      });
      if (!latest) return null;
      if (
        deckSlidesRevision(
          latest.slides ?? [],
          resolveDocumentTemplate(latest.documentTemplate).id,
        ) !== revision
      )
        return null;
      const nextSlides = replaceSlideAt(
        (latest.slides ?? []) as Array<Record<string, unknown>>,
        slideIndex,
        revisedRich,
      ) as Presentation['slides'];
      return payload.update({
        collection: COLLECTIONS.presentations,
        id: latest.id,
        data: { slides: nextSlides },
        req,
        depth: 0,
        overrideAccess: false,
      });
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'La présentation a changé pendant la révision.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ slide: updated.slides?.[slideIndex], slideIndex });
  } catch (error) {
    if (error instanceof PayloadTransactionUnavailable) {
      return NextResponse.json({ error: 'Transaction indisponible.' }, { status: 503 });
    }
    console.error('[revise-slide] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Révision impossible' },
      { status: 422 },
    );
  }
}
