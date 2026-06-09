/**
 * Phase 3 LIVE smoke — the native Mastra rubricScorer scores a known-bad slide
 * low (topic headline + overclaim) and a good slide high. Skipped without a key.
 */
import { describe, expect, it } from 'vitest';

import { scoreSlide } from '../scorers/rubric';

const live = process.env.OPENAI_API_KEY ? describe : describe.skip;

live('rubricScorer (Mastra createScorer)', () => {
  it('scores a topic-headline/overclaim slide below a strong assertion slide', {
    timeout: 120_000,
  }, async () => {
    const bad = await scoreSlide({
      blockType: 'statement',
      title: 'Conclusion', // topic label, not an assertion
      body: 'Notre méthode est tout simplement la meilleure et garantit un succès à 100%.', // overclaim + vague
    });
    const good = await scoreSlide({
      blockType: 'statement',
      title: 'Mener par la conclusion fait décider le COMEX plus vite',
      body: 'En ouvrant par le verdict, le décideur ancre le raisonnement qui suit ; la mémoire de travail (~4 unités, Cowan 2001) cesse de stocker du bruit.',
    });

    console.log(`[rubric] bad=${bad.score} (${bad.fix}) | good=${good.score} (${good.fix})`);
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.score).toBeLessThan(0.7);
  });
});
