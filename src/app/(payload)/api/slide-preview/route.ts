import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';

import { renderBlockPreview } from '@/export/preview';
import { buildPreviewRenderContext } from '@/export/renderContext';
import type { SlideBlock } from '@/export/renderers';
import { buildSlidePreviewChrome } from '@/lib/slidePreviewChrome';
import { COLLECTIONS } from '@/lib/collections';
import { getOrLoadPreviewHydration } from '@/lib/previewHydrationCache';
import {
  buildPreviewResponseCacheKey,
  getPreviewResponse,
  setPreviewResponse,
} from '@/lib/previewResponseCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PreviewRequestBody = {
  block?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  presentationId?: string | number;
  previewFieldPath?: string;
  blockTypes?: string[];
  sections?: string[];
  slideIndex?: number;
};

type AuthedUser = { id: string | number };

// Payload's Local API accepts the authenticated user object directly.
type PayloadUser = Parameters<Awaited<ReturnType<typeof getPayload>>['findByID']>[0]['user'];

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  return NextResponse.json(body, { ...init, headers });
}

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
  payload: Awaited<ReturnType<typeof getPayload>>;
  user: PayloadUser;
  userId: string | number;
}) {
  if (!args.id) return null;
  return getOrLoadPreviewHydration(
    { collection: args.collection, depth: args.depth, id: args.id, userId: args.userId },
    () =>
      args.payload
        .findByID({
          collection: args.collection,
          id: args.id!,
          depth: args.depth,
          overrideAccess: false,
          user: args.user,
        })
        .catch(() => null),
  );
}

async function hydrateCoverIntervenants(
  block: Record<string, unknown>,
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: PayloadUser,
  userId: string | number,
) {
  if (block.blockType !== 'cover' || !Array.isArray(block.intervenants)) return block;

  const rows = await Promise.all(
    block.intervenants.map(async (row) => {
      if (!row || typeof row !== 'object') return row;
      const record = row as Record<string, unknown>;
      const id = relationshipId(record.user);
      const hydratedUser = await hydrateRelationship({
        collection: COLLECTIONS.users,
        depth: 2,
        id,
        payload,
        user,
        userId,
      });
      return hydratedUser ? { ...record, user: hydratedUser } : record;
    }),
  );

  return { ...block, intervenants: rows };
}

async function hydratePreviewBlock(
  block: Record<string, unknown>,
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: PayloadUser,
  userId: string | number,
) {
  if (block.blockType === 'cover') return hydrateCoverIntervenants(block, payload, user, userId);
  return block;
}

async function hydrateChromeFields(
  fields: Record<string, unknown>,
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: PayloadUser,
  userId: string | number,
) {
  const organisationId = relationshipId(fields.organisation);
  const organisation = await hydrateRelationship({
    collection: COLLECTIONS.organisations,
    depth: 1,
    id: organisationId,
    payload,
    user,
    userId,
  });
  return organisation ? { ...fields, organisation } : fields;
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const authedUser = user as AuthedUser;

  const body = (await req.json().catch(() => null)) as PreviewRequestBody | null;
  if (!body?.presentationId) {
    return NextResponse.json({ error: 'Présentation requise' }, { status: 400 });
  }
  if (!body?.block?.blockType) {
    return NextResponse.json({ error: 'Bloc invalide' }, { status: 400 });
  }

  const presentation = await payload
    .findByID({
      collection: COLLECTIONS.presentations,
      id: body.presentationId,
      depth: 0,
      overrideAccess: false,
      user,
    })
    .catch(() => null);
  if (!presentation) {
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  }

  const fields = body.fields ?? {};
  const previewFieldPath = body.previewFieldPath ?? 'slides.0.preview';
  const slideIndex = typeof body.slideIndex === 'number' ? body.slideIndex : 0;
  const renderContext = Array.isArray(body.blockTypes)
    ? buildPreviewRenderContext(body.blockTypes, slideIndex, body.sections ?? [])
    : undefined;

  const cacheKey = buildPreviewResponseCacheKey({
    block: body.block,
    blockTypes: body.blockTypes,
    fields,
    previewFieldPath,
    sections: body.sections,
    slideIndex,
    userId: authedUser.id,
  });
  const cached = getPreviewResponse(cacheKey);
  if (cached) return noStoreJson(cached);

  const hydratedBlock = await hydratePreviewBlock(body.block, payload, user, authedUser.id);
  const hydratedFields = await hydrateChromeFields(fields, payload, user, authedUser.id);
  const preview = renderBlockPreview(hydratedBlock as SlideBlock, renderContext);
  if (!preview)
    return NextResponse.json({ error: 'Prévisualisation indisponible' }, { status: 422 });

  const formFields = Object.fromEntries(
    Object.entries(hydratedFields).map(([key, value]) => [key, { value }]),
  );
  const chrome = buildSlidePreviewChrome(formFields, previewFieldPath, preview.hideChrome);
  const response = setPreviewResponse(cacheKey, { chrome, preview });

  return noStoreJson(response);
}
