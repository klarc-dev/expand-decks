/**
 * Phase 4 LIVE smoke (no LLM) — verify the real Slidev per-slide PNG export.
 * Runs Chromium via slidev-workspace; opt-in only with RUN_SLIDEV_SMOKE_TESTS=1 and the binary present.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
});
