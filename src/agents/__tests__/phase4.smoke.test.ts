/**
 * Phase 4 LIVE smoke — the FULL single run incl. the exportBuild + visual scorer
 * pass: gather → structure → draft → rubric-revise → build PNGs → visual-score →
 * assemble. Gated on a key + the slidev binary. This is the end-to-end proof.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mastra } from '../mastra';

const slidevBin = join(process.cwd(), 'slidev-workspace', 'node_modules', '.bin', 'slidev');
const ready = process.env.OPENAI_API_KEY && existsSync(slidevBin);
const maybe = ready ? describe : describe.skip;

const BRIEF =
  'Short deck (5–6 slides) for corporate lawyers on why leading with the conclusion (BLUF) makes an expert legal talk land: the cognitive reason, one concrete example, the main objection refuted.';

maybe('Phase 4 full run (visual pass)', () => {
  it('builds, visually scores, and assembles a deck end to end', { timeout: 480_000 }, async () => {
    const run = await mastra.getWorkflow('deckWorkflow').createRun();
    const res = await run.start({ inputData: { brief: BRIEF }, initialState: { visual: true } });

    expect(res.status).toBe('success');
    if (res.status !== 'success') return;
    const deck = res.result;

    expect(deck.slides.length).toBeGreaterThanOrEqual(3);
    expect(deck.md).toContain('---');
    expect(deck.md.length).toBeGreaterThan(200);
    console.log(`\n[phase4] final ${deck.slides.length} slides, ${deck.md.length} chars md`);
  });
});
