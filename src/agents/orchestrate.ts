/**
 * Deck build orchestration (Mastra-native phases).
 *
 * This is the in-code sequence the single Mastra workflow will wrap as steps:
 *   gather → structure → foreach(writer) → assemble
 * Later phases attach scorers (.dountil revise loop), the exportBuild step, and
 * the visual scorer. Kept as a plain async function so each phase is testable in
 * isolation; the workflow graph (suspend/durability/streaming) wraps these.
 */
import { REVISE_MAX_ITERATIONS, SCORE_THRESHOLD, WRITER_CONCURRENCY } from '../lib/agentConfig';
import { buildSlidesMd, type Presentation } from '../export/buildSlidesMd';
import type { SlideBlock } from '../export/renderers';
import { gather } from './agents/gather';
import { structure } from './agents/structure';
import { writeSlide } from './agents/writer';
import { scoreSlide } from './scorers/rubric';
import { scoreVisual } from './scorers/visual';
import { exportSlidePngs } from './tools/exportSlidePngs';
import type { DeckDossier } from './schemas';
import type { OutlineStub } from '../blocks/spec/emit/emitDraftSchema';

/** Run an array of async thunks with a fixed concurrency cap, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Critique → revise loop (the `.dountil` revise step). Scores every slide with
 * the rubric scorer; re-writes those below SCORE_THRESHOLD, feeding the scorer's
 * fix instruction back as added intent. Repeats until all pass or
 * REVISE_MAX_ITERATIONS is hit. Overflow is NOT scored — it is prevented at the
 * SSOT (per-layout array bounds).
 */
async function reviseSlides(
  slides: SlideBlock[],
  stubs: OutlineStub[],
  dossier: DeckDossier,
  titles: string[],
  emit: (phase: string, detail?: unknown) => void,
): Promise<SlideBlock[]> {
  let current = slides;

  for (let iteration = 0; iteration < REVISE_MAX_ITERATIONS; iteration++) {
    const scored = await mapWithConcurrency(current, WRITER_CONCURRENCY, (slide) =>
      scoreSlide(slide as Record<string, unknown>),
    );
    const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);

    if (flagged.length === 0) {
      emit('validate:pass', { iteration });
      return current;
    }
    emit('validate:revise', { iteration, flagged: flagged.length });

    const next = [...current];
    await mapWithConcurrency(flagged, WRITER_CONCURRENCY, async ({ i, fix }) => {
      const stub = stubs[i]!;
      const revisedStub: OutlineStub = {
        ...stub,
        intent: `${stub.intent}\n\nCORRECTION DEMANDÉE (critique précédente) : ${fix}`,
      };
      next[i] = (await writeSlide(
        revisedStub,
        dossier,
        titles.filter((_, j) => j !== i),
      )) as SlideBlock;
    });
    current = next;
  }

  emit('validate:capped');
  return current;
}

export type BuiltDeck = {
  dossier: DeckDossier;
  slides: SlideBlock[];
  /** Assembled Slidev markdown (for assemble/preview/build). */
  md: string;
};

/**
 * Gather → Structure → Draft (parallel writers) → Assemble.
 * `title` heads the assembled deck.
 */
export async function draftDeck(
  brief: string,
  opts?: {
    title?: string;
    onPhase?: (phase: string, detail?: unknown) => void;
    /** Run the expensive Slidev build + multimodal visual scorer pass. */
    visual?: boolean;
  },
): Promise<BuiltDeck> {
  const emit = opts?.onPhase ?? (() => {});

  emit('gather');
  const dossier = await gather(brief);

  emit('structure');
  const stubs = await structure(dossier);

  emit('draft', { count: stubs.length });
  const titles = stubs.map((s) => s.title);
  let slides = (await mapWithConcurrency(stubs, WRITER_CONCURRENCY, (stub, i) =>
    writeSlide(
      stub,
      dossier,
      titles.filter((_, j) => j !== i),
    ),
  )) as SlideBlock[];

  emit('validate');
  slides = await reviseSlides(slides, stubs, dossier, titles, emit);

  const title = opts?.title ?? dossier.coreIdea;

  if (opts?.visual) {
    slides = await visualPass(slides, stubs, dossier, titles, title, emit);
  }

  emit('assemble');
  const md = buildSlidesMd({ title, slides });

  emit('done');
  return { dossier, slides, md };
}

/**
 * exportBuild + visual scorer (the post-build, multimodal tier of the advisor
 * pattern). Builds the deck once to per-slide PNGs, scores each rendered slide
 * for real overflow/balance/legibility, and re-writes the slides whose RENDER
 * fails even though their data passed the content rubric. One pass (the build
 * is expensive); cheap rubric/SSOT bounds already caught the rest.
 */
async function visualPass(
  slides: SlideBlock[],
  stubs: OutlineStub[],
  dossier: DeckDossier,
  titles: string[],
  title: string,
  emit: (phase: string, detail?: unknown) => void,
): Promise<SlideBlock[]> {
  emit('build');
  const md = buildSlidesMd({ title, slides });
  const { pngs, cleanup } = await exportSlidePngs(md);
  try {
    emit('visual', { pngs: pngs.length });
    // PNG page i ↔ slide i (per-slide export preserves order).
    const scored = await mapWithConcurrency(slides, WRITER_CONCURRENCY, async (slide, i) => {
      const png = pngs[i]?.base64;
      if (!png) return { score: 1, fix: '' };
      return scoreVisual(slide as Record<string, unknown>, png);
    });

    const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);
    if (flagged.length === 0) {
      emit('visual:pass');
      return slides;
    }
    emit('visual:revise', { flagged: flagged.length });

    const next = [...slides];
    await mapWithConcurrency(flagged, WRITER_CONCURRENCY, async ({ i, fix }) => {
      const stub = stubs[i]!;
      const revisedStub: OutlineStub = {
        ...stub,
        intent: `${stub.intent}\n\nCORRECTION VISUELLE (rendu réel) : ${fix}`,
      };
      next[i] = (await writeSlide(
        revisedStub,
        dossier,
        titles.filter((_, j) => j !== i),
      )) as SlideBlock;
    });
    return next;
  } finally {
    cleanup();
  }
}
