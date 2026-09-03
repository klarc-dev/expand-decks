import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { listKnowledgeSourceOptions, listMcpSourceOptions } from '@/lib/sources/registry';
import { MAX_SELECTED_SOURCES, SourceConfigError } from '@/lib/sources/types';

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  // fallow-ignore-next-line code-duplication -- route auth shape is framework-local and intentionally explicit.
  const knowledgeSources = await listKnowledgeSourceOptions({ payload, user });
  try {
    const mcpSources = await listMcpSourceOptions();
    return NextResponse.json({
      sources: [...mcpSources, ...knowledgeSources],
      maxSelected: MAX_SELECTED_SOURCES,
    });
  } catch (err) {
    if (err instanceof SourceConfigError) {
      console.error('[agent-sources] invalid registry', err);
      return NextResponse.json({
        sources: knowledgeSources,
        maxSelected: MAX_SELECTED_SOURCES,
        error: err.message,
      });
    }
    throw err;
  }
}
