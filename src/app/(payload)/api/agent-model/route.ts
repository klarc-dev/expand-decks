import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';

import { verifyAgentModel } from '@/lib/agentModel';

const requestSchema = z.object({ model: z.unknown() });

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

  try {
    return NextResponse.json(await verifyAgentModel(parsed.data.model));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Modèle indisponible' },
      { status: 422 },
    );
  }
}
