import type { CollectionAfterChangeHook } from 'payload';

import { COLLECTIONS } from '../lib/collections';
import { PRESENTATION_STATUS } from '../lib/status';
import { CTX } from '../lib/context';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';

/**
 * When an organisation's brand (colors/logo/fonts) changes, every PUBLISHED
 * presentation that references it must rebuild — its baked SPA/PDF still carry
 * the old theme. Fan out a build job per referencing published deck.
 *
 * Loop-safe by construction: the build job only ever patches the *presentation*
 * (with skipBuildQueue), never the organisation, so this hook cannot re-fire
 * from a build. The skipBuildQueue guard is belt-and-suspenders.
 */
export const afterOrganisationChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.[CTX.skipBuildQueue]) return doc;
  if (operation !== 'update') return doc;

  const refs = await req.payload.find({
    collection: COLLECTIONS.presentations,
    depth: 0,
    limit: 1000,
    where: {
      and: [
        { organisation: { equals: doc.id } },
        { status: { equals: PRESENTATION_STATUS.published } },
      ],
    },
  });

  for (const presentation of refs.docs) {
    await (req.payload.jobs.queue as Function)({
      task: BUILD_SLIDES_TASK,
      input: { presentationId: String(presentation.id) },
      req,
    });
  }

  return doc;
};
