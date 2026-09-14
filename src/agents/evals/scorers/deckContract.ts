import { createScorer } from '@mastra/core/evals';

import type { DeckGroundTruth } from '../config';

export type DeckEvalOutput = {
  slides?: Array<Record<string, unknown>>;
  markdown?: string;
  md?: string;
  evidence?: unknown[];
  dossier?: { language?: unknown };
};

/** The subset of the eval input the contract gate checks against. */
export type DeckEvalInputLike = { language?: unknown };

export function extractDeckOutput(value: unknown): DeckEvalOutput {
  const output = value as DeckEvalOutput & {
    result?: DeckEvalOutput;
    steps?: Record<string, { status?: string; output?: unknown }>;
  };
  const stepOutputs = Object.values(output.steps ?? {})
    .filter((step) => step.status === 'success')
    .map((step) => step.output as DeckEvalOutput);
  return (
    output.result ??
    stepOutputs.find(
      (candidate) =>
        Array.isArray(candidate?.slides) &&
        (typeof candidate?.markdown === 'string' || typeof candidate?.md === 'string'),
    ) ??
    output
  );
}

export function deckContractScore(
  value: unknown,
  groundTruth?: Partial<DeckGroundTruth>,
  input?: DeckEvalInputLike,
): 0 | 1 {
  const deck = extractDeckOutput(value);
  const slides = deck.slides;
  if (!Array.isArray(slides)) return 0;
  // The requested output language must have travelled through the workflow:
  // the dossier's resolved language is what every localized agent wrote in.
  if (
    typeof input?.language === 'string' &&
    deck.dossier?.language !== undefined &&
    deck.dossier.language !== input.language
  ) {
    return 0;
  }
  if (slides.length < (groundTruth?.minSlides ?? 3)) return 0;
  if (slides.length > (groundTruth?.maxSlides ?? 40)) return 0;
  if (slides[0]?.blockType !== 'cover') return 0;
  if (slides.at(-1)?.blockType !== 'cta') return 0;
  const markdown = deck.markdown ?? deck.md;
  if (typeof markdown !== 'string' || markdown.length === 0) return 0;
  if (deck.evidence !== undefined && !Array.isArray(deck.evidence)) return 0;
  const types = new Set(slides.map((slide) => String(slide.blockType)));
  if ((groundTruth?.requiredBlockTypes ?? []).some((type) => !types.has(type))) return 0;
  return 1;
}

export const deckContractGate = createScorer({
  id: 'deck-contract',
  name: 'Deck output contract',
  description: 'Hard gate for workflow completion and structural invariants.',
}).generateScore(({ run }) =>
  deckContractScore(
    run.output ?? run,
    run.groundTruth as Partial<DeckGroundTruth>,
    run.input as DeckEvalInputLike | undefined,
  ),
);
