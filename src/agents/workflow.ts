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
 *  - Run-level constants (`visual`, `title`) are immutable workflow input.
 *    Mutable workflow state is deliberately not used for request parameters.
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

import { AI_SLIDE_SCHEMA, OUTLINE_SCHEMA } from '../blocks/spec';
import { REVISE_MAX_ITERATIONS, SCORE_THRESHOLD, WRITER_CONCURRENCY } from '../lib/agentConfig';
import { mapWithConcurrency } from '../lib/concurrency';
import { buildSlidesMd } from '../export/buildSlidesMd';
import type { SlideBlock } from '../export/renderers';
import type { OutlineStub } from '../blocks/spec/emit/emitDraftSchema';
import { gather } from './agents/gather';
import { structureWithProvenance } from './agents/structure';
import { writeSlide } from './agents/writer';
import { scoreSlide } from './scorers/rubric';
import { scoreVisual } from './scorers/visual';
import { validateGrounding } from './grounding';
import { exportSlidePngs } from './tools/exportSlidePngs';
import { DeckDossierSchema, type DeckDossier, type DeckEvidence } from './schemas';
import {
  EvidenceSchema,
  SourceFailureSchema,
  type SourceFailure,
  type SourcePolicy,
} from '../lib/sources/types';
import { SourcePolicySchema } from '../lib/sources/policy';

const MAX_DURABLE_EVIDENCE = 200;
const MAX_DURABLE_SOURCE_FAILURES = 100;

function mergeEvidence(...groups: DeckEvidence[][]): DeckEvidence[] {
  const records = new Map<string, DeckEvidence>();
  for (const item of groups.flat()) records.set(item.id, item);
  return [...records.values()].slice(-MAX_DURABLE_EVIDENCE);
}

function mergeSourceFailures(...groups: SourceFailure[][]): SourceFailure[] {
  const records = new Map<string, SourceFailure>();
  for (const item of groups.flat()) {
    const key = [item.sourceId, item.stage, item.code, item.message].join('\u0000');
    records.set(key, item);
  }
  return [...records.values()].slice(-MAX_DURABLE_SOURCE_FAILURES);
}

// ── shared shapes ───────────────────────────────────────────────────────────

/** The data bundle threaded step→step (and round-tripped through `.dountil`). */
type DeckBundle = {
  dossier: DeckDossier;
  evidence: DeckEvidence[];
  sourceFailures: SourceFailure[];
  sourcePolicy: SourcePolicy;
  stubs: OutlineStub[];
  slides: SlideBlock[];
  titles: string[];
  revisionContext?: string;
  /** Slides below threshold at the last validate pass (drives the loop + cap). */
  lastFlagged: number;
  /** True once the revise loop hit REVISE_MAX_ITERATIONS without converging. */
  capped: boolean;
};

const dossierT = DeckDossierSchema;
const evidenceT = EvidenceSchema;
const sourceFailureT = SourceFailureSchema;
const slideT = AI_SLIDE_SCHEMA;
const stubT = OUTLINE_SCHEMA.shape.slides.element;
const bundle = z.object({
  dossier: dossierT,
  evidence: z.array(evidenceT),
  sourceFailures: z.array(sourceFailureT),
  sourcePolicy: SourcePolicySchema,
  stubs: z.array(stubT),
  slides: z.array(slideT),
  titles: z.array(z.string()),
  revisionContext: z.string().optional(),
  lastFlagged: z.number().int().min(0),
  capped: z.boolean(),
});

/** One self-contained writer job — foreach passes only the array element. */
type WriterJob = {
  stub: OutlineStub;
  dossier: DeckDossier;
  allTitles: string[];
  revisionContext?: string;
};
const writerJob = z.object({
  stub: stubT,
  dossier: dossierT,
  allTitles: z.array(z.string()),
  revisionContext: z.string().optional(),
});

// ── steps (step id === phase name; the route maps payload.stepName → status) ──

const gatherStep = createStep({
  id: 'gather',
  inputSchema: z.object({
    brief: z.string(),
    language: z.enum(['fr', 'en']),
    sourcePolicy: SourcePolicySchema.default({ mode: 'none', sourceIds: [] }),
  }),
  outputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceFailures: z.array(sourceFailureT),
    sourcePolicy: SourcePolicySchema,
  }),
  execute: async ({ inputData, abortSignal }) => {
    const { dossier, evidence, sourceFailures } = await gather(
      inputData.brief,
      inputData.sourcePolicy,
      inputData.language,
      abortSignal,
    );
    return {
      dossier,
      evidence: validateGrounding(dossier, evidence),
      sourceFailures,
      sourcePolicy: inputData.sourcePolicy,
    };
  },
});

const structureStep = createStep({
  id: 'structure',
  inputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceFailures: z.array(sourceFailureT),
    sourcePolicy: SourcePolicySchema,
  }),
  outputSchema: z.object({
    dossier: dossierT,
    evidence: z.array(evidenceT),
    sourceFailures: z.array(sourceFailureT),
    sourcePolicy: SourcePolicySchema,
    stubs: z.array(stubT),
  }),
  execute: async ({ inputData, abortSignal }) => {
    const structured = await structureWithProvenance(
      inputData.dossier,
      inputData.sourcePolicy,
      abortSignal,
    );
    return {
      dossier: inputData.dossier,
      evidence: mergeEvidence(inputData.evidence, structured.evidence),
      sourceFailures: mergeSourceFailures(inputData.sourceFailures, structured.sourceFailures),
      sourcePolicy: inputData.sourcePolicy,
      stubs: structured.stubs,
    };
  },
});

const approvalStep = createStep({
  id: 'approval',
  inputSchema: structureStep.outputSchema,
  outputSchema: structureStep.outputSchema,
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({
    reason: z.string(),
    outline: z.array(z.object({ title: z.string(), intent: z.string() })).max(40),
  }),
  execute: async ({ inputData, getInitData, resumeData, suspend, bail }) => {
    if (!(getInitData() as DeckWorkflowInput).approvalRequired) return inputData;
    if (resumeData?.approved === false) return bail(inputData);
    if (!resumeData?.approved) {
      return suspend({
        reason: 'Approve the proposed deck structure before drafting.',
        outline: inputData.stubs.map(({ title, intent }) => ({
          title,
          intent,
        })),
      });
    }
    return inputData;
  },
});

/** foreach body — drafts EXACTLY ONE slide from its self-contained job. */
const draftStep = createStep({
  id: 'draft',
  inputSchema: writerJob,
  outputSchema: slideT,
  execute: async ({ inputData, abortSignal }) =>
    (await writeSlide(
      inputData.stub,
      inputData.dossier,
      inputData.allTitles,
      inputData.revisionContext,
      abortSignal,
    )) as SlideBlock,
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
  execute: async ({ inputData, abortSignal, writer }) => {
    const { stubs, dossier, titles } = inputData;
    const scored = await mapWithConcurrency(inputData.slides, WRITER_CONCURRENCY, (slide) =>
      scoreSlide(slide as Record<string, unknown>, abortSignal),
    );
    const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);

    if (flagged.length === 0) {
      return { ...inputData, lastFlagged: 0 };
    }

    const next = [...inputData.slides];
    await writer.write({
      type: 'deck-event',
      phase: 'validate:revise',
      detail: { count: flagged.length },
    });
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
        inputData.revisionContext,
        abortSignal,
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
  execute: async ({ inputData, getInitData, abortSignal, writer }) => {
    const title = (getInitData() as DeckWorkflowInput).title ?? inputData.dossier.coreIdea;
    const md = buildSlidesMd({
      title,
      slides: inputData.slides as SlideBlock[],
    });
    const { pngs, cleanup } = await exportSlidePngs(md, abortSignal);
    try {
      const scored = await mapWithConcurrency(
        inputData.slides,
        WRITER_CONCURRENCY,
        async (slide, i) => {
          const png = pngs[i];
          if (!png) return { score: 1, fix: '' };
          return scoreVisual(
            slide as Record<string, unknown>,
            {
              base64: png.base64,
              mimeType: 'image/png',
            },
            abortSignal,
          );
        },
      );
      const flagged = scored.map((s, i) => ({ ...s, i })).filter((s) => s.score < SCORE_THRESHOLD);
      if (flagged.length === 0) {
        return inputData;
      }

      const next = [...inputData.slides];
      await writer.write({
        type: 'deck-event',
        phase: 'visual:revise',
        detail: { count: flagged.length },
      });
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
          inputData.revisionContext,
          abortSignal,
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
    sourceFailures: z.array(sourceFailureT),
    sourcePolicy: SourcePolicySchema,
  }),
  execute: async ({ inputData, getInitData }) => {
    const title = (getInitData() as DeckWorkflowInput).title ?? inputData.dossier.coreIdea;
    return {
      dossier: inputData.dossier,
      slides: inputData.slides,
      md: buildSlidesMd({ title, slides: inputData.slides as SlideBlock[] }),
      evidence: inputData.evidence,
      sourceFailures: inputData.sourceFailures,
      sourcePolicy: inputData.sourcePolicy,
    };
  },
});

// ── workflow input/output ────────────────────────────────────────────────────

const InputSchema = z.object({
  brief: z.string(),
  language: z.enum(['fr', 'en']),
  title: z.string().optional(),
  visual: z.boolean().default(false),
  sourcePolicy: SourcePolicySchema.default({ mode: 'none', sourceIds: [] }),
  revisionContext: z.string().max(100_000).optional(),
  approvalRequired: z.boolean().default(false),
});
type DeckWorkflowInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  dossier: dossierT,
  slides: z.array(slideT),
  md: z.string(),
  evidence: z.array(evidenceT),
  sourceFailures: z.array(sourceFailureT),
  sourcePolicy: SourcePolicySchema,
});
export type DeckWorkflowOutput = z.infer<typeof OutputSchema>;

// ── graph ────────────────────────────────────────────────────────────────────

export const deckWorkflow = createWorkflow({
  id: 'deckWorkflow',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
  .then(gatherStep)
  .then(structureStep)
  .then(approvalStep)
  // Bake shared context into each writer job — foreach only passes the element.
  .map(async ({ inputData, getInitData }) =>
    inputData.stubs.map(
      (stub): WriterJob => ({
        stub,
        dossier: inputData.dossier,
        allTitles: inputData.stubs.map((s) => s.title),
        revisionContext: (getInitData() as DeckWorkflowInput).revisionContext,
      }),
    ),
  )
  .foreach(draftStep, { concurrency: WRITER_CONCURRENCY })
  // Re-assemble the bundle from the SlideBlock[] foreach output.
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const slides = inputData as SlideBlock[];
    const structured = getStepResult(structureStep);
    return {
      dossier: structured.dossier,
      evidence: structured.evidence,
      sourceFailures: structured.sourceFailures,
      sourcePolicy: structured.sourcePolicy,
      stubs: structured.stubs,
      slides,
      titles: structured.stubs.map((s) => s.title),
      revisionContext: (getInitData() as DeckWorkflowInput).revisionContext,
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
