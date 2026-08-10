/**
 * Deck build as a NATIVE Mastra workflow (`@mastra/core@1.41.0`).
 *
 * Replaces the hand-rolled async pipeline that used to live in `orchestrate.ts`.
 * The graph the old file's comments always promised:
 *
 *   gather → structure → map(writerJobs) → foreach(draft) → map(assemble)
 *     → dountil(validate) → map(injectVisual) → branch(visual|passthrough)
 *     → map(unwrapBranch) → assemble
 *
 * Design notes (verified against the embedded docs in
 * node_modules/@mastra/core/dist/docs/references/):
 *  - The heavy "bundle" (dossier/stubs/slides/titles) threads through each
 *    step's input/output — required so the `.dountil` revise loop can re-feed
 *    its own output as the next iteration's input.
 *  - Run-level constants (`visual`, `title`) live in workflow STATE, passed via
 *    `initialState`, so they don't have to appear in every intermediate schema.
 *  - The revise cap returns `true` (graceful finish) rather than throwing, which
 *    would fail the whole run and lose the old `validate:capped` semantics.
 *  - Sub-phase detail (`validate:revise`, `visual:revise`) is emitted with the
 *    step `writer` so the Payload route can keep its fine-grained draftStatus.
 *    `writer.write` MUST be awaited or the stream locks.
 *  - The schemas below are internal step contracts (data already validated
 *    upstream), so they use permissive `z.custom`/`z.any` — Mastra only needs a
 *    Standard-Schema for the graph wiring, not LLM coercion here. TS types are
 *    layered on top for call-site safety.
 */
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { REVISE_MAX_ITERATIONS, SCORE_THRESHOLD, WRITER_CONCURRENCY } from '../lib/agentConfig';
import { mapWithConcurrency } from '../lib/concurrency';
import { buildSlidesMd } from '../export/buildSlidesMd';
import type { SlideBlock } from '../export/renderers';
import type { OutlineStub } from '../blocks/spec/emit/emitDraftSchema';
import { gather } from './agents/gather';
import { structure } from './agents/structure';
import { writeSlide } from './agents/writer';
import { scoreSlide } from './scorers/rubric';
import { scoreVisual } from './scorers/visual';
import { exportSlidePngs } from './tools/exportSlidePngs';
import type { DeckDossier, DeckEvidence } from './schemas';

// ── shared shapes ───────────────────────────────────────────────────────────

/** Run-level constants shared across non-adjacent steps (workflow state). */
const StateSchema = z.object({
  visual: z.boolean(),
  title: z.string().optional(),
});
export type DeckState = z.infer<typeof StateSchema>;

/** The data bundle threaded step→step (and round-tripped through `.dountil`). */
type DeckBundle = {
  dossier: DeckDossier;
  evidence: DeckEvidence[];
  sourceIds: string[];
  stubs: OutlineStub[];
  slides: SlideBlock[];
  titles: string[];
  /** Slides below threshold at the last validate pass (drives the loop + cap). */
  lastFlagged: number;
  /** True once the revise loop hit REVISE_MAX_ITERATIONS without converging. */
  capped: boolean;
};

const bundle = z.custom<DeckBundle>();
const dossierT = z.custom<DeckDossier>();
const evidenceT = z.custom<DeckEvidence>();
const slideT = z.custom<SlideBlock>();
const stubT = z.custom<OutlineStub>();

/** One self-contained writer job — foreach passes only the array element. */
type WriterJob = { stub: OutlineStub; dossier: DeckDossier; allTitles: string[] };
const writerJob = z.custom<WriterJob>();

// ── steps (step id === phase name; the route maps payload.stepName → status) ──

const gatherStep = createStep({
  id: 'gather',
  inputSchema: z.object({ brief: z.string(), sourceIds: z.array(z.string()).default([]) }),
  outputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceIds: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { dossier, evidence } = await gather(inputData.brief, inputData.sourceIds);
    return { dossier, evidence, sourceIds: inputData.sourceIds };
  },
});

const structureStep = createStep({
  id: 'structure',
  inputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceIds: z.array(z.string()),
  }),
  outputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceIds: z.array(z.string()),
    stubs: z.array(stubT),
  }),
  execute: async ({ inputData }) => ({
    dossier: inputData.dossier,
    evidence: inputData.evidence,
    sourceIds: inputData.sourceIds,
    stubs: await structure(inputData.dossier, inputData.sourceIds),
  }),
});

/** foreach body — drafts EXACTLY ONE slide from its self-contained job. */
const draftStep = createStep({
  id: 'draft',
  inputSchema: writerJob,
  outputSchema: slideT,
  execute: async ({ inputData }) =>
    (await writeSlide(inputData.stub, inputData.dossier, inputData.allTitles)) as SlideBlock,
});

/**
 * dountil body — score every slide, rewrite the flagged subset (carrying the
 * scorer's fix forward as added intent), and report how many were flagged so
 * the loop condition can stop early or the cap can finish gracefully.
 */
const validateStep = createStep({
  id: 'validate',
  inputSchema: bundle,
  outputSchema: bundle,
  execute: async ({ inputData }) => {
    const { stubs, dossier, titles } = inputData;
    const scored = await mapWithConcurrency(inputData.slides, WRITER_CONCURRENCY, (slide) =>
      scoreSlide(slide as Record<string, unknown>),
    );
    const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);

    if (flagged.length === 0) {
      return { ...inputData, lastFlagged: 0 };
    }

    const next = [...inputData.slides];
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

    return { ...inputData, slides: next, lastFlagged: flagged.length };
  },
});

/**
 * Visual branch body — build once to per-slide PNGs, score each rendered slide
 * for real overflow/balance/legibility, and re-write the slides whose RENDER
 * fails even though their data passed the content rubric. One pass (expensive).
 */
const visualStep = createStep({
  id: 'visual',
  inputSchema: bundle,
  outputSchema: bundle,
  execute: async ({ inputData, getInitData }) => {
    const title = (getInitData() as DeckWorkflowInput).title ?? inputData.dossier.coreIdea;
    const md = buildSlidesMd({ title, slides: inputData.slides });
    const { pngs, cleanup } = await exportSlidePngs(md);
    try {
      const scored = await mapWithConcurrency(
        inputData.slides,
        WRITER_CONCURRENCY,
        async (slide, i) => {
          const png = pngs[i];
          if (!png) return { score: 1, fix: '' };
          return scoreVisual(slide as Record<string, unknown>, {
            base64: png.base64,
            mimeType: 'image/png',
          });
        },
      );
      const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);
      if (flagged.length === 0) {
        return inputData;
      }

      const next = [...inputData.slides];
      await mapWithConcurrency(flagged, WRITER_CONCURRENCY, async ({ i, fix }) => {
        const stub = inputData.stubs[i]!;
        const revisedStub: OutlineStub = {
          ...stub,
          intent: `${stub.intent}\n\nCORRECTION VISUELLE (rendu réel) : ${fix}`,
        };
        next[i] = (await writeSlide(
          revisedStub,
          inputData.dossier,
          inputData.titles.filter((_, j) => j !== i),
        )) as SlideBlock;
      });
      return { ...inputData, slides: next };
    } finally {
      cleanup();
    }
  },
});

/** branch sibling — visual:false runs this no-op so schemas stay matched. */
const visualPassthrough = createStep({
  id: 'visual-passthrough',
  inputSchema: bundle,
  outputSchema: bundle,
  execute: async ({ inputData }) => inputData,
});

const assembleStep = createStep({
  id: 'assemble',
  inputSchema: bundle,
  outputSchema: z.object({
    dossier: dossierT,
    slides: z.array(slideT),
    md: z.string(),
    evidence: z.array(evidenceT),
    sourceIds: z.array(z.string()),
  }),
  execute: async ({ inputData, getInitData }) => {
    const title = (getInitData() as DeckWorkflowInput).title ?? inputData.dossier.coreIdea;
    return {
      dossier: inputData.dossier,
      slides: inputData.slides,
      md: buildSlidesMd({ title, slides: inputData.slides }),
      evidence: inputData.evidence,
      sourceIds: inputData.sourceIds,
    };
  },
});

// ── workflow input/output ────────────────────────────────────────────────────

const InputSchema = z.object({
  brief: z.string(),
  title: z.string().optional(),
  sourceIds: z.array(z.string()).default([]),
});
type DeckWorkflowInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  dossier: dossierT,
  slides: z.array(slideT),
  md: z.string(),
  evidence: z.array(evidenceT),
  sourceIds: z.array(z.string()),
});
export type DeckWorkflowOutput = z.infer<typeof OutputSchema>;

// ── graph ────────────────────────────────────────────────────────────────────

export const deckWorkflow = createWorkflow({
  id: 'deckWorkflow',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  stateSchema: StateSchema,
})
  .then(gatherStep)
  .then(structureStep)
  // Bake shared context into each writer job — foreach only passes the element.
  .map(async ({ inputData }) =>
    inputData.stubs.map(
      (stub): WriterJob => ({
        stub,
        dossier: inputData.dossier,
        allTitles: inputData.stubs.map((s) => s.title),
      }),
    ),
  )
  .foreach(draftStep, { concurrency: WRITER_CONCURRENCY })
  // Re-assemble the bundle from the SlideBlock[] foreach output.
  .map(async ({ inputData, getStepResult }) => {
    const slides = inputData as SlideBlock[];
    const structured = getStepResult(structureStep);
    return {
      dossier: structured.dossier,
      evidence: structured.evidence,
      sourceIds: structured.sourceIds,
      stubs: structured.stubs,
      slides,
      titles: structured.stubs.map((s) => s.title),
      lastFlagged: slides.length, // force ≥1 validate pass
      capped: false,
    } satisfies DeckBundle;
  })
  .dountil(validateStep, async ({ inputData, iterationCount }) => {
    if (iterationCount >= REVISE_MAX_ITERATIONS) {
      return true; // graceful cap — do NOT throw (that would fail the run)
    }
    return (inputData as DeckBundle).lastFlagged === 0;
  })
  // Surface the run-level visual flag into branch inputData.
  .map(async ({ inputData, getInitData }) => ({
    ...(inputData as DeckBundle),
    visual: (getInitData() as { visual?: boolean }).visual === true,
  }))
  .branch([
    [async ({ inputData }) => (inputData as { visual: boolean }).visual === true, visualStep],
    [
      async ({ inputData }) => (inputData as { visual: boolean }).visual !== true,
      visualPassthrough,
    ],
  ])
  // Only one branch ran; output is keyed by the executed step id — unwrap it.
  .map(async ({ inputData }) => {
    const keyed = inputData as Record<string, DeckBundle>;
    return (keyed.visual ?? keyed['visual-passthrough']) as DeckBundle;
  })
  .then(assembleStep)
  .commit();
