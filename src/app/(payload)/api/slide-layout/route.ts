import { NextResponse, type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/authenticateRequest';
import {
  executeSlideLayoutCommand,
  slideLayoutCommandSchema,
  SlideLayoutCommandError,
} from '@/lib/slideLayoutChange';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authenticated slide-layout command boundary used by the admin preview.
export async function POST(req: NextRequest) {
  const { payload, user } = await authenticateRequest(req.headers);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const parsed = slideLayoutCommandSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  try {
    return NextResponse.json(
      await executeSlideLayoutCommand({ command: parsed.data, payload, user }),
    );
  } catch (error) {
    if (error instanceof SlideLayoutCommandError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }
}
