import { getPayload } from 'payload';
import config from '@payload-config';
import { NextResponse } from 'next/server';

import { resolveShareLink, isLive } from '@/lib/shareLinks';
import { serveSpaFile } from '@/lib/spaFiles';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; path?: string[] }> },
) {
  const { token, path: pathSegments = [] } = await params;
  const payload = await getPayload({ config });
  const link = await resolveShareLink(payload, token, 1);

  if (!link || !isLive(link)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const presentation = typeof link.presentation === 'object' ? link.presentation : null;
  if (!presentation?.slug) {
    return new NextResponse('Not found', { status: 404 });
  }

  return serveSpaFile(presentation.slug as string, pathSegments);
}
