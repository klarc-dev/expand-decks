import { headers as nextHeaders } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { serveNativePreview } from '../../nativePreview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; path?: string[] }> },
) {
  const { token, path: pathSegments = [] } = await params;
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await nextHeaders() });
  if (!user) return new NextResponse('Forbidden', { status: 403 });
  return serveNativePreview({ token, userId: user.id, pathSegments });
}
