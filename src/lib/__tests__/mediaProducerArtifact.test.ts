import { describe, expect, it } from 'vitest';

import type { MediaProducerImageArtifact, MediaProducerPdfArtifact } from '../mediaProducer';
import {
  assertPdfConstraints,
  assertTransportConstraints,
  MediaProducerConstraintError,
} from '../mediaProducerArtifact';

const pdf: MediaProducerPdfArtifact = {
  order: 1,
  role: 'delivery_document',
  handle: 1,
  media_type: 'application/pdf',
  bytes: 100,
  sha256: 'a'.repeat(64),
  page_count: 2,
  width_px: 960,
  height_px: 540,
};

const image = (order: number, overrides: Partial<MediaProducerImageArtifact> = {}) => ({
  order,
  role: 'postiz_document_page' as const,
  handle: order,
  media_type: 'image/png' as const,
  bytes: 100,
  sha256: String(order).repeat(64),
  page_count: 1 as const,
  width_px: 1920,
  height_px: 1080,
  alt_text: `Page ${order}`,
  ...overrides,
});

const transportConstraints: {
  media_type: 'image/png';
  max_bytes_each: 10485760;
  minimum_count: 2;
} = {
  media_type: 'image/png',
  max_bytes_each: 10485760,
  minimum_count: 2,
};

const singleImageConstraints = {
  media_type: 'image/png' as const,
  max_bytes_each: 10485760 as const,
  minimum_count: 1 as const,
  maximum_count: 1 as const,
};

describe('media producer artifact constraints', () => {
  it('enforces PDF bytes and page limits', () => {
    expect(() =>
      assertPdfConstraints(pdf, { media_type: 'application/pdf', max_bytes: 99, max_pages: null }),
    ).toThrow(MediaProducerConstraintError);
    expect(() =>
      assertPdfConstraints(pdf, { media_type: 'application/pdf', max_bytes: null, max_pages: 1 }),
    ).toThrow(MediaProducerConstraintError);
  });

  it.each([
    [[image(1)], 'at least 2 images'],
    [[image(2), image(1)], 'orders must be contiguous'],
    [[image(1), image(2, { bytes: 10 * 1024 * 1024 + 1 })], 'above max_bytes_each'],
    [[image(1), image(2, { width_px: 1080 })], 'consistent dimensions'],
  ] as const)('rejects invalid transport sets', (artifacts, message) => {
    expect(() => assertTransportConstraints([...artifacts], transportConstraints)).toThrow(message);
  });

  it('enforces the declared maximum for a single-image transport', () => {
    expect(() =>
      assertTransportConstraints(
        [image(1, { role: 'postiz_image' }), image(2, { role: 'postiz_image' })],
        singleImageConstraints,
      ),
    ).toThrow('at most 1 image');
  });
});
