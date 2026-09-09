import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { userIsAdminOrAuthor, userIsOrganisationMember } from '@/access/roles';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import {
  MEDIA_PRODUCER_REQUEST_SCHEMA,
  MEDIA_PRODUCER_RESULT_SCHEMA,
  MEDIA_PRODUCER_STATUS,
  mediaProducerDocumentTemplate,
  mediaProducerRelationshipId,
  pendingMediaProducerResult,
  terminalMediaProducerResult,
} from '@/lib/mediaProducer';
import { BUILD_SLIDES_TASK } from '@/jobs/buildSlides';
import { patchPresentationBuildMetadata } from '@/jobs/patchPresentationBuildMetadata';
import { BUILD_STATUS } from '@/lib/status';
import type { Presentation } from '@/payload-types';

async function markPriorRequestStale(
  payload: Awaited<ReturnType<typeof authenticateRequest>>['payload'],
  presentation: Presentation | null,
) {
  const priorRequestId = mediaProducerRelationshipId(presentation?.currentMediaProductionRequest);
  if (!priorRequestId) return;
  const prior = await payload.findByID({
    collection: COLLECTIONS.mediaProductionRequests,
    id: priorRequestId as string | number,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  const priorResult = MEDIA_PRODUCER_RESULT_SCHEMA.safeParse(prior?.result);
  if (!prior || !priorResult.success || priorResult.data.status === MEDIA_PRODUCER_STATUS.stale)
    return;
  await payload.update({
    collection: COLLECTIONS.mediaProductionRequests,
    id: prior.id,
    data: {
      status: MEDIA_PRODUCER_STATUS.stale,
      result: terminalMediaProducerResult(
        {
          request_id: priorResult.data.request_id,
          publication_id: priorResult.data.publication_id,
          revision_sha256: priorResult.data.revision_sha256,
          presentation_id: priorResult.data.presentation_id,
        },
        MEDIA_PRODUCER_STATUS.stale,
        'request_replaced',
        'Une nouvelle révision a remplacé cette demande média.',
      ),
    },
    overrideAccess: true,
    depth: 0,
  });
}

// fallow-ignore-next-line complexity -- route owns one authenticated request-to-queue transaction
export async function POST(req: NextRequest) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!userIsAdminOrAuthor(user))
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const parsed = MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  const command = parsed.data;
  if (!userIsOrganisationMember(user, command.organisation_id))
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  if (
    command.constraints.delivery_pdf !== null &&
    command.constraints.delivery_pdf.max_pages !== null &&
    command.pages.length > command.constraints.delivery_pdf.max_pages
  )
    return NextResponse.json({ error: 'La demande dépasse max_pages.' }, { status: 422 });

  let existingPresentation = null;
  if (command.presentation_id !== undefined) {
    existingPresentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: command.presentation_id,
      user,
      overrideAccess: false,
      disableErrors: true,
      depth: 0,
    });
    if (!existingPresentation)
      return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
    if (!userIsOrganisationMember(user, existingPresentation.organisation))
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    const existingOrg =
      typeof existingPresentation.organisation === 'object'
        ? existingPresentation.organisation?.id
        : existingPresentation.organisation;
    if (String(existingOrg) !== String(command.organisation_id))
      return NextResponse.json({ error: 'Organisation incohérente' }, { status: 409 });
  }

  const requestId = randomUUID();
  const requestRecord = await payload.create({
    collection: COLLECTIONS.mediaProductionRequests,
    data: {
      requestId,
      publicationId: command.publication_id,
      revisionSha256: command.revision_sha256,
      format: command.intended_format,
      organisation: command.organisation_id,
      presentation: existingPresentation?.id,
      request: command,
      status: MEDIA_PRODUCER_STATUS.queued,
    },
    overrideAccess: true,
    depth: 0,
  });

  let boundPresentationId: string | number | null = existingPresentation?.id ?? null;
  try {
    const documentTemplate = mediaProducerDocumentTemplate(command.intended_format);
    const presentationData = {
      title: command.title,
      language: command.language,
      organisation: command.organisation_id,
      slides: command.pages.map((page) => page.block),
      currentMediaProductionRequest: requestRecord.id,
      ...(documentTemplate ? { documentTemplate } : {}),
    };
    const presentation: Presentation = existingPresentation
      ? await payload.update({
          collection: COLLECTIONS.presentations,
          id: existingPresentation.id,
          data: presentationData as never,
          user,
          overrideAccess: false,
          depth: 0,
          context: { [CTX.mediaProducerRequest]: true },
        })
      : await payload.create({
          collection: COLLECTIONS.presentations,
          data: presentationData as never,
          user,
          overrideAccess: false,
          depth: 0,
          context: { [CTX.mediaProducerRequest]: true },
        });
    boundPresentationId = presentation.id;
    await markPriorRequestStale(payload, existingPresentation);

    const buildToken = randomUUID();
    const identity = {
      request_id: requestId,
      publication_id: command.publication_id,
      revision_sha256: command.revision_sha256,
      presentation_id: presentation.id,
    };
    const result = pendingMediaProducerResult(identity, MEDIA_PRODUCER_STATUS.queued);
    await payload.update({
      collection: COLLECTIONS.mediaProductionRequests,
      id: requestRecord.id,
      data: { presentation: presentation.id, buildToken, result },
      overrideAccess: true,
      depth: 0,
    });
    await patchPresentationBuildMetadata(payload, presentation.id, {
      lastBuildRequestedAt: new Date().toISOString(),
      lastBuildToken: buildToken,
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
    });
    await (payload.jobs.queue as (args: unknown) => Promise<unknown>)({
      task: BUILD_SLIDES_TASK,
      input: {
        presentationId: String(presentation.id),
        buildToken,
        mediaProductionRequestId: String(requestRecord.id),
        mediaRequestId: requestId,
        publicationId: command.publication_id,
        revisionSha256: command.revision_sha256,
      },
    });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (boundPresentationId !== null) {
      const result = terminalMediaProducerResult(
        {
          request_id: requestId,
          publication_id: command.publication_id,
          revision_sha256: command.revision_sha256,
          presentation_id: boundPresentationId,
        },
        MEDIA_PRODUCER_STATUS.failed,
        'queue_failed',
        'Impossible de lancer la production média.',
      );
      await payload.update({
        collection: COLLECTIONS.mediaProductionRequests,
        id: requestRecord.id,
        data: { status: MEDIA_PRODUCER_STATUS.failed, result },
        overrideAccess: true,
      });
      await patchPresentationBuildMetadata(payload, boundPresentationId, {
        lastBuildStatus: BUILD_STATUS.failed,
        lastBuildError: 'Impossible de lancer la production média.',
        lastBuildRequestedAt: null,
      });
    } else {
      await payload.delete({
        collection: COLLECTIONS.mediaProductionRequests,
        id: requestRecord.id,
        overrideAccess: true,
      });
    }
    payload.logger?.error?.({ err: error, msg: `Failed to queue media request ${requestId}` });
    return NextResponse.json({ error: 'Production impossible' }, { status: 500 });
  }
}
