import { createHash } from 'node:crypto';

/** Stable id of a relationship value (number id or populated {id}) for hashing. */
function relId(rel: unknown): unknown {
  return rel && typeof rel === 'object' ? (rel as { id?: unknown }).id : rel;
}

/**
 * Fingerprint of every field that affects the built output. Anything that
 * changes the generated deck — slides, the organisation (theme/logo/font), the
 * footer config, title, language — must be here, or an edit to it on an already
 * published deck would silently NOT rebuild. Lives in lib (not the hook) so the
 * build-job runner can import it without a hook → jobs → runner import cycle.
 */
export function buildFingerprint(doc: Record<string, unknown>): string {
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
