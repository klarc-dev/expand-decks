/**
 * Phase 4 LIVE smoke (no LLM) — verify the real Slidev per-slide PNG export.
 * Runs Chromium via slidev-workspace; opt-in only with RUN_SLIDEV_SMOKE_TESTS=1 and the binary present.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

import { describe, expect, it } from 'vitest';

import { exportSlidePngs } from '../tools/exportSlidePngs';
import { buildSlidesMd } from '../../export/buildSlidesMd';

const slidevBin = join(process.cwd(), 'slidev-workspace', 'node_modules', '.bin', 'slidev');
const hasSlidev = process.env.RUN_SLIDEV_SMOKE_TESTS === '1' && existsSync(slidevBin);
const maybe = hasSlidev ? describe : describe.skip;

maybe('exportSlidePngs (real Slidev)', () => {
  it('exports one PNG per slide', { timeout: 300_000 }, async () => {
    const md = buildSlidesMd({
      title: 'PNG export check',
      slides: [
        { blockType: 'cover', title: 'Cover slide' },
        {
          blockType: 'statement',
          title: 'A single assertion',
          body: 'Grounded by one concrete line.',
        },
        { blockType: 'cta', title: 'Do this next' },
      ] as never,
    });

    const { pngs, cleanup } = await exportSlidePngs(md);
    try {
      console.log(`[png] exported ${pngs.length} pngs; first=${pngs[0]?.base64.length} b64 chars`);
      expect(pngs.length).toBe(3);
      for (const p of pngs) {
        expect(p.base64.length).toBeGreaterThan(1000); // a real rendered image
      }
    } finally {
      cleanup();
    }
  });

  it('exports an ordered 1080x1350 LinkedIn carousel PNG for every page', {
    timeout: 300_000,
  }, async () => {
    const md = buildSlidesMd({
      title: 'LinkedIn carousel export check',
      documentTemplate: 'linkedin-carousel',
      slides: [
        { blockType: 'cover', title: 'First page' },
        { blockType: 'statement', title: 'Second page', body: 'One concise idea.' },
        { blockType: 'cta', title: 'Third page' },
      ] as never,
    });

    const { pngs, cleanup } = await exportSlidePngs(md);
    try {
      expect(pngs).toHaveLength(3);
      for (const png of pngs) {
        expect(png.base64.length).toBeGreaterThan(1000);
        const metadata = await sharp(Buffer.from(png.base64, 'base64')).metadata();
        expect(metadata.width).toBe(1080);
        expect(metadata.height).toBe(1350);
      }
    } finally {
      cleanup();
    }
  });
});
