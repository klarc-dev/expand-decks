import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';

import { ROLES } from '@/access/roles';
import { mastra } from '@/agents/mastra';
import { COLLECTIONS } from '@/lib/collections';

const feedbackSchema = z.discriminatedUnion('type', [
  z.object({
    presentationId: z.union([z.string().min(1).max(128), z.number()]),
    type: z.literal('thumbs'),
    value: z.union([z.literal(1), z.literal(-1)]),
    comment: z.string().trim().max(2_000).optional(),
  }),
  z.object({
    presentationId: z.union([z.string().min(1).max(128), z.number()]),
    type: z.literal('rating'),
    value: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2_000).optional(),
  }),
  z.object({
    presentationId: z.union([z.string().min(1).max(128), z.number()]),
    type: z.enum(['comment', 'correction']),
    value: z.string().trim().min(1).max(2_000),
  }),
]);

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: parsed.data.presentationId,
    user,
    disableErrors: true,
  });
  if (!presentation) {
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  }
  const ownerId =
    typeof presentation.createdBy === 'object'
      ? presentation.createdBy?.id
      : presentation.createdBy;
  if (user.role !== ROLES.admin && ownerId !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  if (!presentation.draftTraceId) {
    return NextResponse.json({ error: 'Aucune trace terminée' }, { status: 409 });
  }

  if (!mastra.observability?.addFeedback) {
    return NextResponse.json({ error: 'Observabilité indisponible' }, { status: 503 });
  }
  await mastra.observability.addFeedback({
    traceId: presentation.draftTraceId,
    feedback: {
      feedbackSource: 'user',
      feedbackType: parsed.data.type,
      value: parsed.data.value,
      feedbackUserId: String(user.id),
      sourceId: String(presentation.id),
      ...('comment' in parsed.data && parsed.data.comment ? { comment: parsed.data.comment } : {}),
      metadata: { presentationId: String(presentation.id) },
    },
  });

  return NextResponse.json({ recorded: true });
}
