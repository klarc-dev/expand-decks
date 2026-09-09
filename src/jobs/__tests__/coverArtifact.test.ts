import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import sharp from 'sharp';

import { assertPageImages, firstPngPath, pngPaths } from '../buildSlidesRunner';

describe('firstPngPath', () => {
  it('selects the first numbered Slidev PNG deterministically', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cover-artifact-test-'));
    try {
      writeFileSync(join(directory, 'slides-10.png'), '10');
      writeFileSync(join(directory, 'slides-1.png'), '1');
      writeFileSync(join(directory, 'notes.txt'), 'ignore');

      expect(firstPngPath(directory)).toBe(join(directory, 'slides-1.png'));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('sorts every generated page image numerically', () => {
    const directory = mkdtempSync(join(tmpdir(), 'page-artifact-test-'));
    try {
      writeFileSync(join(directory, 'slides-10.png'), '10');
      writeFileSync(join(directory, 'slides-2.png'), '2');
      writeFileSync(join(directory, 'slides-1.png'), '1');

      expect(pngPaths(directory)).toEqual([
        join(directory, 'slides-1.png'),
        join(directory, 'slides-2.png'),
        join(directory, 'slides-10.png'),
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('validates page-image count and declared dimensions', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'page-artifact-test-'));
    const file = join(directory, 'slides-1.png');
    try {
      await sharp({
        create: { width: 1080, height: 1350, channels: 4, background: '#ffffff' },
      })
        .png()
        .toFile(file);

      await expect(
        assertPageImages([file], { count: 1, width: 1080, height: 1350 }),
      ).resolves.toBeUndefined();
      await expect(
        assertPageImages([file], { count: 2, width: 1080, height: 1350 }),
      ).rejects.toThrow('1 images pour 2 pages');
      await expect(
        assertPageImages([file], { count: 1, width: 1280, height: 720 }),
      ).rejects.toThrow('1080×1350');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
