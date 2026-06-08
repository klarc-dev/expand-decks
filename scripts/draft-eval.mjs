/**
 * Draft eval harness — diagnostic iteration loop for AI presentation drafting.
 *
 * Unlike draft-smoke.mjs (count + types only), this prints timing, full block
 * breakdown, per-slide titles, and writes the raw JSON + rendered slides.md so
 * each iteration can be inspected. Run with env loaded:
 *
 *   node_modules/.bin/tsx --env-file=.env scripts/draft-eval.mjs [briefFile] [model]
 *
 * briefFile defaults to scripts/pi-brief.txt; model overrides OPENAI_MODEL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { draftPresentationSlides } from '../src/lib/draftPresentation.ts';
import { buildSlidesMd } from '../src/export/buildSlidesMd.ts';

const briefFile = process.argv[2] ?? 'scripts/pi-brief.txt';
const model = process.argv[3];

const brief = readFileSync(briefFile, 'utf8');
console.log(`brief: ${briefFile} (${brief.length} chars)`);
console.log(`model: ${model ?? process.env.OPENAI_MODEL ?? 'default'}`);

const t0 = Date.now();
try {
  const result = await draftPresentationSlides(brief, model ? { model } : undefined);
  const ms = Date.now() - t0;
  const slides = result.slides;
  console.log(`\nOK in ${(ms / 1000).toFixed(1)}s — ${slides.length} slides\n`);

  const counts = {};
  for (const s of slides) counts[s.blockType] = (counts[s.blockType] ?? 0) + 1;
  console.log('block counts:', JSON.stringify(counts));
  console.log('\nslide list:');
  slides.forEach((s, i) => {
    const title = s.title ?? s.heading ?? '(no title)';
    console.log(`  ${String(i + 1).padStart(2)}. ${s.blockType.padEnd(10)} ${title}`);
  });

  writeFileSync('/tmp/draft-eval.json', JSON.stringify(result, null, 2));
  try {
    const md = buildSlidesMd({ title: 'Eval', slides });
    writeFileSync('/tmp/draft-eval.slides.md', md);
    console.log('\nwrote /tmp/draft-eval.json and /tmp/draft-eval.slides.md');
  } catch (e) {
    console.error('\nrender failed:', e instanceof Error ? e.message : e);
  }
  process.exit(0);
} catch (error) {
  const ms = Date.now() - t0;
  console.error(`\nFAILED after ${(ms / 1000).toFixed(1)}s`);
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
}
