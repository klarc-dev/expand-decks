import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { listMcpSourceOptions } from '@/lib/sources/registry';
import { SourceConfigError } from '@/lib/sources/types';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    return NextResponse.json({ sources: await listMcpSourceOptions() });
  } catch (err) {
    if (err instanceof SourceConfigError) {
      console.error('[agent-sources] invalid registry', err);
      return NextResponse.json({ sources: [], error: err.message });
    }
    throw err;
  }
}
