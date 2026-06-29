/**
 * Phase 4 LIVE multimodal smoke — proves the 9router gateway accepts image
 * inputs through Mastra, end to end: render a real slide PNG, then have the
 * visualScorer judge it. Opt-in only: set RUN_LIVE_AGENT_TESTS=1 plus OPENAI_API_KEY and the slidev binary.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { exportSlidePngs } from '../tools/exportSlidePngs';
import { scoreVisual } from '../scorers/visual';
import { buildSlidesMd } from '../../export/buildSlidesMd';

const slidevBin = join(process.cwd(), 'slidev-workspace', 'node_modules', '.bin', 'slidev');
const ready =
  process.env.RUN_LIVE_AGENT_TESTS === '1' && process.env.OPENAI_API_KEY && existsSync(slidevBin);
const maybe = ready ? describe : describe.skip;

maybe('visualScorer (multimodal via 9router)', () => {
  it('scores a clean rendered slide and returns a numeric verdict', {
    timeout: 300_000,
  }, async () => {
    const slide = {
      blockType: 'statement',
      title: 'Une seule affirmation, claire et lisible',
      body: 'Une ligne concrète qui soutient le titre.',
    };
    const md = buildSlidesMd({ title: 'Visual check', slides: [slide] as never });
    const { pngs, cleanup } = await exportSlidePngs(md);
    try {
      expect(pngs.length).toBe(1);
      const { score, fix } = await scoreVisual(slide, pngs[0]!.base64);
      console.log(`[visual] score=${score} fix="${fix}"`);
      // The proof point: a numeric 0..1 verdict came back — vision works.
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      // A clean single-statement slide should not be judged broken.
      expect(score).toBeGreaterThan(0.5);
    } finally {
      cleanup();
    }
  });
});
