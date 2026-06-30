import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { boundVisualImage } from '../tools/visualImage';

async function imageMetadata(base64: string) {
  return sharp(Buffer.from(base64, 'base64')).metadata();
}

function deterministicNoise(width: number, height: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  let state = 0x12345678;
  for (let index = 0; index < pixels.length; index += 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    pixels[index] = state & 0xff;
  }
  return pixels;
}

describe('boundVisualImage()', () => {
  it('returns a valid bounded image instead of truncating base64', async () => {
    // Given: a rendered slide-sized PNG larger than the scorer budget.
    const input = await sharp({
      create: {
        width: 2400,
        height: 1350,
        channels: 3,
        background: '#f8fafc',
      },
    })
      .png()
      .toBuffer();

    // When: the image is prepared for visual scoring.
    const bounded = await boundVisualImage(
      { base64: input.toString('base64'), mimeType: 'image/png' },
      { maxWidth: 640, maxHeight: 360, maxBytes: 120_000, jpegQuality: 78 },
    );

    // Then: the result remains a complete image and fits the configured bounds.
    const metadata = await imageMetadata(bounded.base64);
    expect(bounded.mimeType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBeLessThanOrEqual(640);
    expect(metadata.height).toBeLessThanOrEqual(360);
    expect(bounded.byteLength).toBeLessThanOrEqual(120_000);
    expect(bounded.originalByteLength).toBe(input.byteLength);
    expect(bounded.resized).toBe(true);
    expect(input.toString('base64').startsWith(bounded.base64)).toBe(false);
  });

  it('keeps high-entropy images under the configured byte budget', async () => {
    // Given: noisy rendered pixels that do not compress like flat slide backgrounds.
    const input = await sharp(deterministicNoise(1024, 576), {
      raw: { width: 1024, height: 576, channels: 3 },
    })
      .png()
      .toBuffer();

    // When: the image is prepared with a tight scorer byte budget.
    const bounded = await boundVisualImage(
      { base64: input.toString('base64'), mimeType: 'image/png' },
      { maxWidth: 1024, maxHeight: 576, maxBytes: 32_000, jpegQuality: 90 },
    );

    // Then: it remains a valid JPEG and the byte bound is a hard guarantee.
    const metadata = await imageMetadata(bounded.base64);
    expect(metadata.format).toBe('jpeg');
    expect(bounded.byteLength).toBeLessThanOrEqual(32_000);
    expect(Buffer.from(bounded.base64, 'base64').byteLength).toBe(bounded.byteLength);
  });

  it('keeps small images valid without enlarging them', async () => {
    // Given: a small PNG already inside the scorer dimension budget.
    const input = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer();

    // When: the image is prepared for visual scoring.
    const bounded = await boundVisualImage(
      { base64: input.toString('base64'), mimeType: 'image/png' },
      { maxWidth: 640, maxHeight: 360, maxBytes: 120_000, jpegQuality: 78 },
    );

    // Then: it is still valid and dimensions are not enlarged.
    const metadata = await imageMetadata(bounded.base64);
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);
    expect(bounded.resized).toBe(false);
    expect(bounded.originalByteLength).toBe(input.byteLength);
  });
});
