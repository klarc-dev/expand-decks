import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { MAX_SELECTED_SOURCES } from '@/lib/draftConfig';
import { listKnowledgeSourceOptions } from '@/lib/sources/registry';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // fallow-ignore-next-line code-duplication -- route auth shape is framework-local and intentionally explicit.
  return NextResponse.json({
    sources: await listKnowledgeSourceOptions({ payload, user }),
    maxSelected: MAX_SELECTED_SOURCES,
  });
}
