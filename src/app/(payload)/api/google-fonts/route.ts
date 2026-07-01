import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { FALLBACK_FONTS, listGoogleFonts } from '@/lib/googleFonts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authenticated font catalog for the admin picker. Returns family names/metadata
// only — the Google Fonts API key never leaves the server. Falls back to the
// built-in families when the key is unset or the upstream fetch fails.
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const result = await listGoogleFonts({ sort: 'popularity' });
  return NextResponse.json(
    {
      fonts: result.fonts.map((f) => ({ family: f.family, category: f.category })),
      live: result.live,
      ...(result.error ? { error: result.error } : {}),
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
}

export { FALLBACK_FONTS };
