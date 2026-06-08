import { createHash } from 'node:crypto';

import type { CollectionAfterChangeHook } from 'payload';

import { PRESENTATION_STATUS } from '../lib/status';
import { CTX } from '../lib/context';
import { BUILD_SLIDES_TASK } from '../jobs/buildSlides';

/** Stable id of a relationship value (number id or populated {id}) for hashing. */
function relId(rel: unknown): unknown {
  return rel && typeof rel === 'object' ? (rel as { id?: unknown }).id : rel;
}

/**
 * Fingerprint of every field that affects the built output. Anything that
 * changes the generated deck — slides, the organisation (theme/logo/font), the
 * footer config, title, language — must be here, or an edit to it on an already
 * published deck would silently NOT rebuild.
 */
function buildFingerprint(doc: Record<string, unknown>): string {
  const inputs = {
    slides: doc.slides ?? [],
    organisation: relId(doc.organisation),
    footer: doc.footer ?? null,
    title: doc.title ?? '',
    language: doc.language ?? '',
  };
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

/** True when any build-affecting input changed between previous and current doc. */
export function buildInputsChanged(
  doc: Record<string, unknown>,
  previousDoc: Record<string, unknown>,
): boolean {
  return buildFingerprint(doc) !== buildFingerprint(previousDoc);
}

export const afterPresentationChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  // Skip if explicitly flagged (builder patching back results)
  if (req.context?.[CTX.skipBuildQueue]) return doc;

  // Only queue on create/update when status is published
  if (operation !== 'create' && operation !== 'update') return doc;
  if (doc.status !== PRESENTATION_STATUS.published) return doc;

  // On update: only queue if it's a fresh publish or slides content changed
  if (operation === 'update' && previousDoc) {
    const wasPublished = previousDoc.status === PRESENTATION_STATUS.published;
    const contentChanged = buildInputsChanged(doc, previousDoc);

    // Already published and no build-affecting input changed — skip
    if (wasPublished && !contentChanged) return doc;
  }

  // Cast needed until `payload generate:types` adds buildSlides to TypedJobs
  await (req.payload.jobs.queue as Function)({
    task: BUILD_SLIDES_TASK,
    input: { presentationId: doc.id as string },
    req,
  });

  return doc;
};
