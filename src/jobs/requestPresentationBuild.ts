import { sql } from '@payloadcms/db-postgres';
import { randomUUID } from 'node:crypto';
import type { PayloadRequest } from 'payload';

import { userIsAdminOrAuthor, userIsOrganisationMember } from '../access/roles';
import { COLLECTIONS } from '../lib/collections';
import { presentationBuildIdSchema } from '../lib/deckActionsContract';
import { BUILD_COOLDOWN_MS } from '../lib/draftConfig';
import { PayloadTransactionUnavailable, withPayloadTransaction } from '../lib/payloadTransaction';
import { BUILD_STATUS } from '../lib/status';
import { BUILD_SLIDES_TASK, buildConcurrencyKey } from './buildSlides';
import { patchPresentationBuildMetadata } from './patchPresentationBuildMetadata';

const notFound = () => Response.json({ error: 'Présentation introuvable' }, { status: 404 });
const busy = () =>
  Response.json(
    { error: 'L’aperçu et le PDF sont déjà en cours de préparation. Réessayez dans un instant.' },
    { status: 429 },
  );

export async function requestPresentationBuild(req: PayloadRequest): Promise<Response> {
  const { payload, user } = req;
  if (!user || (user.membershipStatus && user.membershipStatus !== 'active')) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (!userIsAdminOrAuthor(user)) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const rawId = req.routeParams?.id;
  const parsedId = presentationBuildIdSchema.safeParse(
    typeof rawId === 'string' && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : rawId,
  );
  if (!parsedId.success) return Response.json({ error: 'Identifiant invalide' }, { status: 400 });
  const id = parsedId.data;
  const presentationId = String(id);

  try {
    return await withPayloadTransaction(payload, req, async (transactionReq, db) => {
      await payload.db.execute({
        db,
        sql: sql`SELECT id FROM presentations WHERE id = ${id} FOR UPDATE`,
      });
      const presentation = await payload.findByID({
        collection: COLLECTIONS.presentations,
        id,
        depth: 0,
        disableErrors: true,
        overrideAccess: false,
        user,
        req: transactionReq,
      });
      if (!presentation || !userIsOrganisationMember(user, presentation.organisation))
        return notFound();
      const last = Date.parse(presentation.lastBuildRequestedAt ?? '');
      if (Date.now() - last < BUILD_COOLDOWN_MS) return busy();

      // Long-running queued/retrying jobs outlast the visible cooldown. Check
      // the actual native queue, not a possibly orphaned "building" status.
      const active = await payload.find({
        collection: 'payload-jobs',
        where: {
          concurrencyKey: { equals: buildConcurrencyKey({ presentationId }) },
          completedAt: { exists: false },
          or: [{ hasError: { equals: false } }, { hasError: { exists: false } }],
        },
        select: {},
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req: transactionReq,
      });
      if (active.docs.length > 0) return busy();

      const build = {
        lastBuildRequestedAt: new Date().toISOString(),
        lastBuildToken: randomUUID(),
        lastBuildStatus: BUILD_STATUS.building,
        lastBuildError: '',
      };
      await patchPresentationBuildMetadata(payload, id, build, transactionReq);
      await payload.jobs.queue({
        task: BUILD_SLIDES_TASK,
        input: { presentationId, buildToken: build.lastBuildToken },
        req: transactionReq,
      });

      return Response.json({
        queued: true,
        buildToken: build.lastBuildToken,
        lastBuildStatus: build.lastBuildStatus,
        lastBuildRequestedAt: build.lastBuildRequestedAt,
      });
    });
  } catch (err) {
    payload.logger.error({ err, msg: `Failed to queue presentation ${id} export` });
    return Response.json(
      { error: 'Reconstruction non confirmée. Vérifiez le statut avant toute nouvelle demande.' },
      { status: err instanceof PayloadTransactionUnavailable ? 503 : 500 },
    );
  }
}
