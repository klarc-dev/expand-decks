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

type DeckSlides = NonNullable<DeckEvalOutput['slides']>;

/**
 * The requested output language must have travelled through the workflow:
 * the dossier's resolved language is what every localized agent wrote in.
 */
function languageMatches(deck: DeckEvalOutput, input?: DeckEvalInputLike): boolean {
  if (typeof input?.language !== 'string' || deck.dossier?.language === undefined) return true;
  return deck.dossier.language === input.language;
}

function slideCountWithin(count: number, groundTruth?: Partial<DeckGroundTruth>): boolean {
  return count >= (groundTruth?.minSlides ?? 3) && count <= (groundTruth?.maxSlides ?? 40);
}

function framedByCoverAndCta(slides: DeckSlides): boolean {
  return slides[0]?.blockType === 'cover' && slides.at(-1)?.blockType === 'cta';
}

function hasRequiredBlockTypes(slides: DeckSlides, groundTruth?: Partial<DeckGroundTruth>) {
  const types = new Set(slides.map((slide) => String(slide.blockType)));
  return (groundTruth?.requiredBlockTypes ?? []).every((type) => types.has(type));
}

function hasMarkdown(deck: DeckEvalOutput): boolean {
  const markdown = deck.markdown ?? deck.md;
  return typeof markdown === 'string' && markdown.length > 0;
}

export function deckContractScore(
  value: unknown,
  groundTruth?: Partial<DeckGroundTruth>,
  input?: DeckEvalInputLike,
): 0 | 1 {
  const deck = extractDeckOutput(value);
  const slides = deck.slides;
  if (!Array.isArray(slides)) return 0;
  const valid =
    languageMatches(deck, input) &&
    slideCountWithin(slides.length, groundTruth) &&
    framedByCoverAndCta(slides) &&
    hasMarkdown(deck) &&
    (deck.evidence === undefined || Array.isArray(deck.evidence)) &&
    hasRequiredBlockTypes(slides, groundTruth);
  return valid ? 1 : 0;
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
