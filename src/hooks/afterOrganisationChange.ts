import { randomUUID } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { COLLECTIONS } from '../lib/collections';
import { BUILD_STATUS, PRESENTATION_STATUS } from '../lib/status';
import { CTX } from '../lib/context';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';
import { patchPresentationBuildMetadata } from '../jobs/patchPresentationBuildMetadata';

/**
 * When an organisation's brand (colors/logo/fonts) changes, every PUBLISHED
 * presentation that references it must rebuild — its baked SPA/PDF still carry
 * the old theme. Fan out a build job per referencing published deck.
 *
 * The build token is stamped through the same validation-free metadata patch
 * the presentation hook uses: re-saving a deck through the collection
 * operation would re-validate its content against today's authoring limits,
 * and one older deck over a limit would roll back the organisation save.
 *
 * Loop-safe by construction: the metadata patch never runs presentation hooks
 * and the build job only ever patches the *presentation* (with skipBuildQueue),
 * never the organisation, so this hook cannot re-fire from a build.
 */
export const afterOrganisationChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (req.context?.[CTX.skipBuildQueue]) return doc;
  if (operation !== 'update') return doc;

  for (let page = 1; ; page++) {
    const refs = await req.payload.find({
      collection: COLLECTIONS.presentations,
      depth: 0,
      limit: 1000,
      page,
      where: {
        and: [
          { organisation: { equals: doc.id } },
          { status: { equals: PRESENTATION_STATUS.published } },
        ],
      },
    });

    for (const presentation of refs.docs) {
      const buildToken = randomUUID();
      await patchPresentationBuildMetadata(
        req.payload,
        presentation.id,
        {
          lastBuildToken: buildToken,
          lastBuildRequestedAt: new Date().toISOString(),
          lastBuildStatus: BUILD_STATUS.building,
          lastBuildError: '',
        },
        req,
      );
      await (req.payload.jobs.queue as Function)({
        task: BUILD_SLIDES_TASK,
        input: { presentationId: String(presentation.id), buildToken },
        req,
      });
    }

    if (!refs.hasNextPage) break;
  }

  return doc;
};
