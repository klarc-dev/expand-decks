import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
const dbUpdateOne = vi.fn();
const queue = vi.fn();
const findByID = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('@/lib/authenticateRequest', () => ({
  authenticateRequest: vi.fn(async () => ({
    payload: {
      create,
      db: { updateOne: dbUpdateOne },
      findByID,
      jobs: { queue },
      logger: { error: vi.fn() },
      update,
      delete: remove,
    },
    user: { id: 7, role: 'author', organisations: [3] },
  })),
}));

import { POST } from '../route';

const body = (overrides: Record<string, unknown> = {}) => ({
  contract: 'expand-decks.media-request/1.0',
  publication_id: 'publication-1',
  revision_sha256: 'a'.repeat(64),
  producer: 'expand-decks',
  intended_format: 'linkedin_document_carousel',
  copy_relationship: 'accompanies_caption',
  title: 'A document',
  language: 'fr',
  organisation_id: 3,
  pages: [
    {
      order: 1,
      block: { blockType: 'statement', title: 'One point' },
      alt_text: 'One point',
    },
    {
      order: 2,
      block: { blockType: 'statement', title: 'Second point' },
      alt_text: 'Second point',
    },
  ],
  accessibility: { reading_order_required: true, minimum_body_px: null },
  constraints: {
    delivery_pdf: { media_type: 'application/pdf', max_bytes: null, max_pages: null },
    transport_images: {
      media_type: 'image/png',
      max_bytes_each: 10 * 1024 * 1024,
      minimum_count: 2,
    },
  },
  ...overrides,
});

const request = (value: unknown) =>
  new Request('http://localhost/api/media-producer/requests', {
    method: 'POST',
    body: JSON.stringify(value),
  }) as Parameters<typeof POST>[0];

describe('POST /api/media-producer/requests', () => {
  beforeEach(() => {
    create.mockReset();
    dbUpdateOne.mockReset().mockResolvedValue({});
    findByID.mockReset();
    queue.mockReset().mockResolvedValue({});
    update.mockReset();
    remove.mockReset();
    create.mockResolvedValueOnce({ id: 91 }).mockResolvedValueOnce({ id: 42, organisation: 3 });
  });

  it('creates a durable request and presentation using the existing slide pipeline', async () => {
    const response = await POST(request(body()));
    expect(response.status).toBe(202);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toMatchObject({
      collection: 'presentations',
      data: {
        title: 'A document',
        organisation: 3,
        slides: [
          { blockType: 'statement', title: 'One point' },
          { blockType: 'statement', title: 'Second point' },
        ],
        currentMediaProductionRequest: 91,
      },
      overrideAccess: false,
    });
    expect(await response.json()).toMatchObject({
      contract: 'expand-decks.media-result/1.0',
      publication_id: 'publication-1',
      presentation_id: 42,
      status: 'queued',
      delivery_artifacts: [],
      transport_artifacts: [],
      adapter: null,
    });
    expect(queue).toHaveBeenCalledWith({
      task: 'buildSlides',
      input: expect.objectContaining({
        presentationId: '42',
        mediaProductionRequestId: '91',
        mediaRequestId: expect.any(String),
        publicationId: 'publication-1',
        revisionSha256: 'a'.repeat(64),
      }),
    });
  });

  it('rejects requests for an organisation outside the caller scope', async () => {
    const response = await POST(request(body({ organisation_id: 99 })));
    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('revises the named presentation and binds a new durable request', async () => {
    findByID.mockResolvedValueOnce({
      id: 42,
      organisation: 3,
      currentMediaProductionRequest: null,
    });
    create.mockReset().mockResolvedValue({ id: 92 });
    update.mockResolvedValue({ id: 42, organisation: 3 });

    const response = await POST(
      request(body({ presentation_id: 42, revision_sha256: 'b'.repeat(64) })),
    );
    expect(response.status).toBe(202);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'presentations',
        id: 42,
        data: expect.objectContaining({ currentMediaProductionRequest: 92 }),
        context: { mediaProducerRequest: true },
      }),
    );
  });

  it('marks the prior producer revision stale when rebinding a presentation', async () => {
    const priorResult = {
      contract: 'expand-decks.media-result/1.0',
      producer: 'expand-decks',
      producer_version: '1.0.0',
      request_id: '23bdf992-2ea9-498d-9b40-fbe350f31628',
      publication_id: 'prior-publication',
      revision_sha256: 'c'.repeat(64),
      presentation_id: 42,
      status: 'building',
      delivery_artifacts: [],
      transport_artifacts: [],
      adapter: null,
      validation: { layout: 'pending', visual_review: 'pending', editorial_review: 'pending' },
      error: null,
    };
    findByID
      .mockResolvedValueOnce({ id: 42, organisation: 3, currentMediaProductionRequest: 17 })
      .mockResolvedValueOnce({ id: 17, result: priorResult });
    create.mockReset().mockResolvedValue({ id: 92 });
    update.mockResolvedValue({ id: 42, organisation: 3 });

    const response = await POST(request(body({ presentation_id: 42 })));

    expect(response.status).toBe(202);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media-production-requests',
        id: 17,
        data: expect.objectContaining({
          status: 'stale',
          result: expect.objectContaining({
            error: { code: 'request_replaced', message: expect.any(String) },
          }),
        }),
      }),
    );
  });

  it('fails closed when queueing the producer job fails', async () => {
    queue.mockRejectedValue(new Error('queue unavailable'));
    update.mockResolvedValue({});

    const response = await POST(request(body()));

    expect(response.status).toBe(500);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media-production-requests',
        id: 91,
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(dbUpdateOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        collection: 'presentations',
        id: 42,
        data: expect.objectContaining({ lastBuildStatus: 'failed' }),
      }),
    );
  });

  it('deletes an unbound request when presentation creation fails', async () => {
    create.mockReset().mockResolvedValueOnce({ id: 91 }).mockRejectedValueOnce(new Error('db'));
    remove.mockResolvedValue({});

    const response = await POST(request(body()));

    expect(response.status).toBe(500);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'media-production-requests', id: 91 }),
    );
  });
});
