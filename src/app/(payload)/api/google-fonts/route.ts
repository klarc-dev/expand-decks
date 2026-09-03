import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { GoogleFontsUnavailableError, LOCAL_FONTS, listGoogleFonts } from '@/lib/googleFonts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authenticated font catalog for the admin picker. Returns family names/categories
// only — the Google Fonts API key never leaves the server. The locally bundled
// families are prepended to the live catalog. If the catalog is unavailable the
// route answers 503 rather than serving a truncated list that would look like a
// complete catalog to the picker.
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  try {
    const fonts = await listGoogleFonts({ sort: 'popularity' });
    const localFamilies = new Set(LOCAL_FONTS.map((f) => f.family));
    const merged = [...LOCAL_FONTS, ...fonts.filter((f) => !localFamilies.has(f.family))];

    return NextResponse.json(
      { fonts: merged.map((f) => ({ family: f.family, category: f.category })) },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (err) {
    if (err instanceof GoogleFontsUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
}
