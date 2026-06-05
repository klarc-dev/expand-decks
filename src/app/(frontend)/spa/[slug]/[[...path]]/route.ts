import { headers as nextHeaders } from 'next/headers';

import { getPayload } from 'payload';
import config from '@payload-config';
import { NextResponse } from 'next/server';

import { serveSpaFile } from '@/lib/spaFiles';
import { SLUG_RE } from '@/lib/slug';
import { COLLECTIONS } from '@/lib/collections';

/**
 * Auth-gated viewer for built presentation SPAs (the `spaUrl` shown in the
 * admin Sortie tab). Mirrors the presentations collection's read access
 * (any logged-in user). Anonymous sharing goes through /share/<token> instead.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path: pathSegments = [] } = await params;

  if (!SLUG_RE.test(slug)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Only serve SPAs that belong to an actual presentation
  const { totalDocs } = await payload.count({
    collection: COLLECTIONS.presentations,
    where: { slug: { equals: slug } },
    overrideAccess: true,
  });
  if (totalDocs === 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  return serveSpaFile(slug, pathSegments);
}
