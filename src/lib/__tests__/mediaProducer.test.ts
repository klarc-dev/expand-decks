import { describe, expect, it } from 'vitest';

import {
  artifactMatchesMediaRecord,
  MEDIA_PRODUCER_REQUEST_SCHEMA,
  MEDIA_PRODUCER_RESULT_SCHEMA,
  MEDIA_PRODUCER_STATUS,
  mediaProducerCapabilities,
  presentationMatchesMediaRequest,
} from '../mediaProducer';

const revision = 'a'.repeat(64);
const page = (order: number) => ({
  order,
  block: { blockType: 'statement', title: `Page ${order}` },
  alt_text: `Description ${order}`,
});

describe('media producer contract', () => {
  it('derives its published slide schema from the writable block SSOT', () => {
    const manifest = mediaProducerCapabilities();
    expect(manifest.contract).toBe('expand-decks.media-capabilities/1.0');
    expect(manifest.formats.linkedin_document_carousel).toMatchObject({
      status: 'supported',
      delivery: { media_type: 'application/pdf', artifact_role: 'delivery_document' },
      transport: { media_type: 'image/png', artifact_role: 'postiz_document_page' },
      adapter: { settings: { post_as_images_carousel: true } },
    });
    expect(JSON.stringify(manifest.slide_schema)).toContain('statement');
    expect(JSON.stringify(manifest.slide_schema)).toContain('cover');
  });

  it('accepts ordered pages backed by existing block schemas', () => {
    expect(
      MEDIA_PRODUCER_REQUEST_SCHEMA.parse({
        contract: 'expand-decks.media-request/1.0',
        publication_id: 'publication-1',
        revision_sha256: revision,
        producer: 'expand-decks',
        intended_format: 'linkedin_document_carousel',
        copy_relationship: 'accompanies_caption',
        title: 'A document',
        language: 'fr',
        organisation_id: 7,
        pages: [page(1), page(2)],
        accessibility: { reading_order_required: true, minimum_body_px: null },
        constraints: {
          delivery_pdf: { media_type: 'application/pdf', max_bytes: null, max_pages: null },
          transport_images: {
            media_type: 'image/png',
            max_bytes_each: 10 * 1024 * 1024,
            minimum_count: 2,
          },
        },
      }),
    ).toMatchObject({ publication_id: 'publication-1', pages: [{ order: 1 }, { order: 2 }] });
  });

  it('rejects duplicated page order and invalid blocks', () => {
    const base = {
      contract: 'expand-decks.media-request/1.0',
      publication_id: 'publication-1',
      revision_sha256: revision,
      producer: 'expand-decks',
      intended_format: 'linkedin_document_carousel',
      copy_relationship: 'accompanies_caption',
      title: 'A document',
      language: 'fr',
      organisation_id: 7,
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
    expect(
      MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse({ ...base, pages: [page(1), page(1)] }).success,
    ).toBe(false);
    expect(
      MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse({
        ...base,
        pages: [{ order: 1, block: { blockType: 'statement' }, alt_text: 'Missing title' }],
      }).success,
    ).toBe(false);
    expect(MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse({ ...base, pages: [page(1)] }).success).toBe(
      false,
    );
    expect(
      MEDIA_PRODUCER_REQUEST_SCHEMA.safeParse({
        ...base,
        pages: [page(1), page(2)],
        accessibility: { reading_order_required: true, minimum_body_px: 18 },
      }).success,
    ).toBe(false);
  });

  it('binds requests to the exact normalized presentation inputs', () => {
    const request = MEDIA_PRODUCER_REQUEST_SCHEMA.parse({
      contract: 'expand-decks.media-request/1.0',
      publication_id: 'publication-1',
      revision_sha256: revision,
      producer: 'expand-decks',
      intended_format: 'linkedin_document_carousel',
      copy_relationship: 'accompanies_caption',
      title: 'A document',
      language: 'fr',
      organisation_id: 7,
      pages: [page(1), page(2)],
      accessibility: { reading_order_required: true, minimum_body_px: null },
      constraints: {
        delivery_pdf: { media_type: 'application/pdf', max_bytes: null, max_pages: null },
        transport_images: {
          media_type: 'image/png',
          max_bytes_each: 10 * 1024 * 1024,
          minimum_count: 2,
        },
      },
    });
    expect(
      presentationMatchesMediaRequest(
        {
          title: 'A document',
          language: 'fr',
          organisation: { id: 7 },
          slides: [
            { ...page(1).block, id: 'payload-row-id' },
            { ...page(2).block, id: 'payload-row-id-2' },
          ],
        },
        request,
      ),
    ).toBe(true);
    expect(
      presentationMatchesMediaRequest(
        {
          title: 'Changed',
          language: 'fr',
          organisation: 7,
          slides: [page(1).block, page(2).block],
        },
        request,
      ),
    ).toBe(false);
  });

  it('fails closed when persisted artifact metadata drifts', () => {
    const result = MEDIA_PRODUCER_RESULT_SCHEMA.parse({
      contract: 'expand-decks.media-result/1.0',
      producer: 'expand-decks',
      producer_version: '1.0.0',
      request_id: '23bdf992-2ea9-498d-9b40-fbe350f31628',
      publication_id: 'publication-1',
      revision_sha256: revision,
      presentation_id: 42,
      status: MEDIA_PRODUCER_STATUS.succeeded,
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
    });
    const media = {
      id: 8,
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
    expect(artifactMatchesMediaRecord(result, result.delivery_artifacts[0]!, media, 5)).toBe(true);
    expect(artifactMatchesMediaRecord(result, result.delivery_artifacts[0]!, media, 6)).toBe(false);
    expect(
      artifactMatchesMediaRecord(result, result.delivery_artifacts[0]!, {
        ...media,
        artifactSha256: 'c'.repeat(64),
      }),
    ).toBe(false);
  });
});
