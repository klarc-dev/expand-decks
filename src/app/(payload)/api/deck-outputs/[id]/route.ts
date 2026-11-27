import { APIError } from 'payload';
import { recordIdSchema } from '@/authoring/payloadSchema';
import { availableArtifactLinks } from '@/documents/artifacts';
import { authenticateRequest } from '@/lib/authenticateRequest';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, user } = await authenticateRequest(request.headers);
  if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = recordIdSchema.safeParse(Number((await params).id));
  if (!parsed.success) return Response.json({ error: 'Identifiant invalide' }, { status: 400 });
  try {
    const presentation = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: parsed.data,
      depth: 1,
      select: {
        artifacts: true,
        lastBuildStatus: true,
        lastBuildError: true,
        lastBuildToken: true,
      },
      // Payload derives its protected file URL from the selected filename.
      populate: { media: { filename: true, url: true } },
      user,
      overrideAccess: false,
    });
    return Response.json(
      {
        id: presentation.id,
        status: presentation.lastBuildStatus,
        error: presentation.lastBuildError || null,
        links: availableArtifactLinks(presentation),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    if (!(error instanceof APIError) || ![403, 404].includes(error.status)) throw error;
    return Response.json({ error: 'Présentation introuvable' }, { status: 404 });
  }
}
