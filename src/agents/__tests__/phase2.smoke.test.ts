/**
 * Phase 2 LIVE smoke — full gather → structure → foreach(writer) → assemble.
 * Asserts every drafted slide renders (buildSlidesMd throws on unknown/invalid
 * blocks) and the assembled markdown is non-trivial. Opt-in only: set RUN_LIVE_AGENT_TESTS=1 plus OPENAI_API_KEY.
 */
import { describe, expect, it } from 'vitest';

import { mastra } from '../mastra';
import { ALL_SPECS } from '../../blocks/spec';

const live =
  process.env.RUN_LIVE_AGENT_TESTS === '1' && process.env.OPENAI_API_KEY ? describe : describe.skip;
const DRAFTABLE = new Set(ALL_SPECS.map((s) => s.blockType));

const BRIEF =
  'Court deck (5–6 slides) for corporate lawyers: why leading with the conclusion (BLUF) makes an expert legal talk land. Cover the cognitive reason, one concrete example, and the main objection refuted.';

live('Phase 2 live (deckWorkflow)', () => {
  it('drafts renderable slides and assembles markdown', { timeout: 300_000 }, async () => {
    const run = await mastra.getWorkflow('deckWorkflow').createRun();
    const res = await run.start({
      inputData: {
        brief: BRIEF,
        language: 'en',
        sourcePolicy: { mode: 'none', sourceIds: [] },
        visual: false,
        approvalRequired: false,
      },
    });

    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    const deck = res.result;

    expect(deck.slides.length).toBeGreaterThanOrEqual(3);
    // Every slide is a known block type and carries its locked discriminant.
    for (const s of deck.slides) {
      expect(DRAFTABLE.has((s as { blockType: string }).blockType)).toBe(true);
      expect((s as { title?: string }).title).toBeTruthy();
    }
    // Assembled markdown is a real Slidev deck (headmatter + slide separators).
    expect(deck.md).toContain('---');
    expect(deck.md.length).toBeGreaterThan(200);

    console.log(
      `\n[phase2] ${deck.slides.length} slides, ${deck.md.length} chars md\n` +
        deck.slides
          .map(
            (s, i) =>
              `  ${i + 1}. [${(s as { blockType: string }).blockType}] ${(s as { title: string }).title}`,
          )
          .join('\n'),
    );
  });
});
