import config from '@payload-config';
import { getPayload } from 'payload';

import { getBuildIdentity } from '@/lib/buildIdentity';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config });
    await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
    });

    return Response.json(
      { status: 'ok', ...getBuildIdentity() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'error', ...getBuildIdentity() },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
