import { NextResponse, type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';
import {
  artifactMatchesMediaRecord,
  mediaProducerRelationshipId,
  MEDIA_PRODUCER_REQUEST_SCHEMA,
  MEDIA_PRODUCER_RESULT_SCHEMA,
  MEDIA_PRODUCER_STATUS,
  presentationMatchesMediaRequest,
  terminalMediaProducerResult,
} from '@/lib/mediaProducer';
import { artifactFileMatches } from '@/lib/mediaProducerArtifact';

export async function GET(req: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { requestId } = await context.params;
  const found = await payload.find({
    collection: COLLECTIONS.mediaProductionRequests,
    where: { requestId: { equals: requestId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const record = found.docs[0];
  if (!record) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  const presentationId =
    typeof record.presentation === 'object' ? record.presentation?.id : record.presentation;
  const presentation = presentationId
    ? await payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        user,
        overrideAccess: false,
        disableErrors: true,
        depth: 0,
      })
    : null;
  if (!presentation) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });

  const parsed = MEDIA_PRODUCER_RESULT_SCHEMA.safeParse(record.result);
  if (!parsed.success)
    return NextResponse.json({ error: 'Résultat producteur invalide' }, { status: 500 });
  if (parsed.data.status === MEDIA_PRODUCER_STATUS.succeeded) {
    const request = MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse(record.request);
    const requestIsCurrent =
      request.success &&
      String(mediaProducerRelationshipId(presentation.currentMediaProductionRequest)) ===
        String(record.id) &&
      presentationMatchesMediaRequest(
        presentation as unknown as Record<string, unknown>,
        request.data,
      );
    const artifacts = [...parsed.data.delivery_artifacts, ...parsed.data.transport_artifacts];
    const verified = requestIsCurrent
      ? await Promise.all(
          artifacts.map(async (artifact) => {
            const media = await payload.findByID({
              collection: COLLECTIONS.media,
              id: artifact.handle,
              depth: 0,
              overrideAccess: true,
              disableErrors: true,
            });
            return Boolean(
              media &&
                artifactMatchesMediaRecord(
                  parsed.data,
                  artifact,
                  media as unknown as Record<string, unknown>,
                  record.id,
                ) &&
                (await artifactFileMatches(artifact, media as unknown as Record<string, unknown>)),
            );
          }),
        )
      : [];
    if (!requestIsCurrent || verified.some((matches) => !matches)) {
      const stale = terminalMediaProducerResult(
        {
          request_id: parsed.data.request_id,
          publication_id: parsed.data.publication_id,
          revision_sha256: parsed.data.revision_sha256,
          presentation_id: parsed.data.presentation_id,
        },
        MEDIA_PRODUCER_STATUS.stale,
        requestIsCurrent ? 'artifact_mismatch' : 'revision_mismatch',
        requestIsCurrent
          ? 'Les métadonnées persistées ne correspondent plus au résultat producteur.'
          : 'La présentation ne correspond plus à cette révision producteur.',
      );
      await payload.update({
        collection: COLLECTIONS.mediaProductionRequests,
        id: record.id,
        data: { status: MEDIA_PRODUCER_STATUS.stale, result: stale },
        overrideAccess: true,
        depth: 0,
      });
      return NextResponse.json(stale);
    }
  }
  return NextResponse.json(parsed.data);
}
