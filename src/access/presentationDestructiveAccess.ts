import type { Access, PayloadRequest } from 'payload';

import { relationshipId, userIsAdmin } from './roles';

/** The native admin confirmation dialogs submit through this browser session.
 * Detached clients must use the authenticated confirmation route instead. */
export function isNativePresentationInteraction(req: PayloadRequest): boolean {
  if (req.payloadAPI !== 'REST' && req.payloadAPI !== 'GraphQL') return true;
  // Payload validates this session's cookie against its normal CSRF policy.
  // Its permission resolver also calls access on document navigations, which
  // do not carry the same Fetch Metadata as a mutation.
  return !req.headers.has('Authorization') && req.headers.has('Cookie');
}

export const canDeletePresentation: Access = ({ req }) =>
  userIsAdmin(req.user) && isNativePresentationInteraction(req);

export function changesPresentationVisibilityOrRemovesSlides(
  data: Record<string, unknown>,
  previous: Record<string, unknown>,
): boolean {
  if (
    Object.hasOwn(data, 'organisation') &&
    String(relationshipId(data.organisation)) !== String(relationshipId(previous.organisation))
  ) {
    return true;
  }
  if (
    !Object.hasOwn(data, 'slides') ||
    !Array.isArray(previous.slides) ||
    previous.slides.length === 0
  ) {
    return false;
  }
  if (!Array.isArray(data.slides) || data.slides.length < previous.slides.length) return true;
  const nextIds = new Set(data.slides.map(relationshipId));
  return previous.slides.some((slide) => {
    const id = relationshipId(slide);
    return id !== undefined && !nextIds.has(id);
  });
}
