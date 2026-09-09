import { beforeEach, describe, expect, it, vi } from 'vitest';

const { find, findByID, update, artifactFileMatches } = vi.hoisted(() => ({
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
  artifactFileMatches: vi.fn(),
}));

vi.mock('@/lib/authenticateRequest', () => ({
  authenticateRequest: vi.fn(async () => ({
    payload: { find, findByID, update },
    user: { id: 7, role: 'author', organisations: [3] },
  })),
}));
vi.mock('@/lib/mediaProducerArtifact', () => ({ artifactFileMatches }));

import { GET } from '../route';

const result = {
  contract: 'expand-decks.media-result/1.0',
  producer: 'expand-decks',
  producer_version: '1.0.0',
  request_id: '23bdf992-2ea9-498d-9b40-fbe350f31628',
  publication_id: 'publication-1',
  revision_sha256: 'a'.repeat(64),
  presentation_id: 42,
  status: 'succeeded',
  delivery_artifacts: [
    {
      order: 1,
      role: 'delivery_document',
      handle: 8,
      media_type: 'application/pdf',
      bytes: 100,
      sha256: 'b'.repeat(64),
      page_count: 2,
      width_px: 960,
      height_px: 540,
    },
  ],
  transport_artifacts: [1, 2].map((order) => ({
    order,
    role: 'postiz_document_page',
    handle: 8 + order,
    media_type: 'image/png',
    bytes: 50,
    sha256: String(order).repeat(64),
    page_count: 1,
    width_px: 960,
    height_px: 540,
    alt_text: `Description ${order}`,
  })),
  adapter: {
    provider: 'postiz',
    route: 'linkedin_images_to_document',
    settings: { post_as_images_carousel: true, carousel_name: 'A document' },
  },
  validation: { layout: 'passed', visual_review: 'pending', editorial_review: 'pending' },
  error: null,
};
const storedRequest = {
  contract: 'expand-decks.media-request/1.0',
  publication_id: result.publication_id,
  revision_sha256: result.revision_sha256,
  producer: 'expand-decks',
  intended_format: 'linkedin_document_carousel',
  copy_relationship: 'accompanies_caption',
  title: 'A document',
  language: 'fr',
  organisation_id: 3,
  pages: [1, 2].map((order) => ({
    order,
    block: { blockType: 'statement', title: `Page ${order}` },
    alt_text: `Description ${order}`,
  })),
  accessibility: { reading_order_required: true, minimum_body_px: null },
  constraints: {
    delivery_pdf: { media_type: 'application/pdf', max_bytes: null, max_pages: null },
    transport_images: {
      media_type: 'image/png',
      max_bytes_each: 10 * 1024 * 1024,
      minimum_count: 2,
    },
  },
};

const media = {
  id: 8,
  filename: 'artifact.pdf',
  mediaProductionRequest: 5,
  producerContract: result.contract,
  producerRequestId: result.request_id,
  publicationId: result.publication_id,
  revisionSha256: result.revision_sha256,
  artifactOrder: 1,
  artifactGroup: 'delivery',
  artifactRole: 'delivery_document',
  artifactMediaType: 'application/pdf',
  artifactBytes: 100,
  artifactSha256: 'b'.repeat(64),
  artifactPageCount: 2,
  artifactWidthPx: 960,
  artifactHeightPx: 540,
};

describe('GET /api/media-producer/requests/:requestId', () => {
  beforeEach(() => {
    find.mockReset().mockResolvedValue({
      docs: [
        { id: 5, requestId: result.request_id, presentation: 42, request: storedRequest, result },
      ],
    });
    findByID.mockReset().mockImplementation(async ({ collection, id }) => {
      if (collection === 'presentations')
        return {
          id: 42,
          title: 'A document',
          language: 'fr',
          organisation: 3,
          currentMediaProductionRequest: 5,
          slides: storedRequest.pages.map((page) => page.block),
        };
      if (id === 8) return media;
      const order = Number(id) - 8;
      const artifact = result.transport_artifacts[order - 1]!;
      return {
        id,
        filename: `artifact-${order}.png`,
        alt: artifact.alt_text,
        mediaProductionRequest: 5,
        producerContract: result.contract,
        producerRequestId: result.request_id,
        publicationId: result.publication_id,
        revisionSha256: result.revision_sha256,
        artifactOrder: order,
        artifactGroup: 'transport',
        artifactRole: 'postiz_document_page',
        artifactMediaType: 'image/png',
        artifactBytes: 50,
        artifactSha256: String(order).repeat(64),
        artifactPageCount: 1,
        artifactWidthPx: 960,
        artifactHeightPx: 540,
      };
    });
    update.mockReset().mockResolvedValue({});
    artifactFileMatches.mockReset().mockResolvedValue(true);
  });

  it('returns a succeeded result only when persisted metadata and bytes match', async () => {
    const response = await GET(
      new Request('http://localhost/api/media-producer/requests/x') as Parameters<typeof GET>[0],
      { params: Promise.resolve({ requestId: result.request_id }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'succeeded',
      delivery_artifacts: [{ handle: 8 }],
      transport_artifacts: [{ handle: 9 }, { handle: 10 }],
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('marks a nominal success stale when the stored bytes no longer match', async () => {
    artifactFileMatches
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const response = await GET(
      new Request('http://localhost/api/media-producer/requests/x') as Parameters<typeof GET>[0],
      { params: Promise.resolve({ requestId: result.request_id }) },
    );
    expect(await response.json()).toMatchObject({
      status: 'stale',
      delivery_artifacts: [],
      transport_artifacts: [],
      adapter: null,
      error: { code: 'artifact_mismatch' },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'stale' }) }),
    );
  });

  it('marks an older success stale after the presentation is rebound', async () => {
    findByID.mockImplementation(async ({ collection, id }) => {
      if (collection === 'presentations')
        return {
          id: 42,
          title: 'A document',
          language: 'fr',
          organisation: 3,
          currentMediaProductionRequest: 99,
          slides: storedRequest.pages.map((page) => page.block),
        };
      return { ...media, id };
    });

    const response = await GET(
      new Request('http://localhost/api/media-producer/requests/x') as Parameters<typeof GET>[0],
      { params: Promise.resolve({ requestId: result.request_id }) },
    );

    expect(await response.json()).toMatchObject({
      status: 'stale',
      delivery_artifacts: [],
      transport_artifacts: [],
      error: { code: 'revision_mismatch' },
    });
    expect(artifactFileMatches).not.toHaveBeenCalled();
  });
});
