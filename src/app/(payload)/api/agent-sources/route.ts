import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { listSourceOptions } from '@/lib/sources/registry';
import { MAX_SELECTED_SOURCES, SourceConfigError } from '@/lib/sources/types';

// Lists the external knowledge sources an author can attach to an agentic
// build. Options come from the runtime registry (AGENT_SOURCE_REGISTRY_JSON),
// not a per-user collection, so any authenticated user sees the same id/label
// set — never the underlying command/url/env (those stay server-side).
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    return NextResponse.json({ sources: listSourceOptions(), maxSelected: MAX_SELECTED_SOURCES });
  } catch (err) {
    if (err instanceof SourceConfigError) {
      // Misconfigured env shouldn't 500 the panel — report empty + a reason so
      // the UI can show "no sources" rather than a hard failure.
      console.error('[agent-sources] invalid registry', err);
      return NextResponse.json({
        sources: [],
        maxSelected: MAX_SELECTED_SOURCES,
        error: err.message,
      });
    }
    throw err;
  }
}
