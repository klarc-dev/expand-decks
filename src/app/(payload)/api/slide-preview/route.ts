import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { renderBlockPreview } from '@/export/preview';
import type { SlideBlock } from '@/export/renderers';
import { buildSlidePreviewChrome } from '@/lib/slidePreviewChrome';
import { COLLECTIONS } from '@/lib/collections';

type PreviewRequestBody = {
  block?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  previewFieldPath?: string;
  sections?: string[];
};

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string' || typeof record.id === 'number') return record.id;
  if (typeof record.value === 'string' || typeof record.value === 'number') return record.value;
  return null;
}

async function hydrateRelationship(args: {
  collection: typeof COLLECTIONS.users | typeof COLLECTIONS.organisations;
  depth: number;
  id: string | number | null;
  req: NextRequest;
}) {
  if (!args.id) return null;
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: args.req.headers });
  if (!user) return null;
  return payload
    .findByID({
      collection: args.collection,
      id: args.id,
      depth: args.depth,
      overrideAccess: false,
      user,
    })
    .catch(() => null);
}

async function hydrateCoverIntervenants(block: Record<string, unknown>, req: NextRequest) {
  if (block.blockType !== 'cover' || !Array.isArray(block.intervenants)) return block;

  const rows = await Promise.all(
    block.intervenants.map(async (row) => {
      if (!row || typeof row !== 'object') return row;
      const record = row as Record<string, unknown>;
      const id = relationshipId(record.user);
      const user = await hydrateRelationship({ collection: COLLECTIONS.users, depth: 2, id, req });
      return user ? { ...record, user } : record;
    }),
  );

  return { ...block, intervenants: rows };
}

async function hydratePreviewBlock(block: Record<string, unknown>, req: NextRequest) {
  if (block.blockType === 'cover') return hydrateCoverIntervenants(block, req);
  return block;
}

async function hydrateChromeFields(fields: Record<string, unknown>, req: NextRequest) {
  const organisationId = relationshipId(fields.organisation);
  const organisation = await hydrateRelationship({
    collection: COLLECTIONS.organisations,
    depth: 1,
    id: organisationId,
    req,
  });
  return organisation ? { ...fields, organisation } : fields;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as PreviewRequestBody | null;
  if (!body?.block?.blockType) {
    return NextResponse.json({ error: 'Bloc invalide' }, { status: 400 });
  }

  const fields = body.fields ?? {};
  const previewFieldPath = body.previewFieldPath ?? 'slides.0.preview';
  const hydratedBlock = await hydratePreviewBlock(body.block, req);
  const hydratedFields = await hydrateChromeFields(fields, req);
  const preview = renderBlockPreview(hydratedBlock as SlideBlock, body.sections ?? []);
  if (!preview)
    return NextResponse.json({ error: 'Prévisualisation indisponible' }, { status: 422 });

  const formFields = Object.fromEntries(
    Object.entries(hydratedFields).map(([key, value]) => [key, { value }]),
  );
  const chrome = buildSlidePreviewChrome(formFields, previewFieldPath, preview.hideChrome);

  return NextResponse.json({ chrome, preview });
}
