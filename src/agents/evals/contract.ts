type DeckLike = { slides?: unknown[]; markdown?: string; md?: string; evidence?: unknown[] };

export function deckContractScore(value: unknown): 0 | 1 {
  const output = value as DeckLike & {
    result?: DeckLike;
    steps?: Record<string, { status?: string; output?: unknown }>;
  };
  const stepOutputs = Object.values(output.steps ?? {})
    .filter((step) => step.status === 'success')
    .map((step) => step.output as DeckLike);
  const deck =
    output.result ??
    stepOutputs.find(
      (candidate) =>
        Array.isArray(candidate?.slides) &&
        (typeof candidate?.markdown === 'string' || typeof candidate?.md === 'string'),
    ) ??
    output;
  const evidenceValid = deck.evidence === undefined || Array.isArray(deck.evidence);
  const markdown = deck.markdown ?? deck.md;
  return Array.isArray(deck.slides) &&
    deck.slides.length >= 3 &&
    deck.slides.length <= 40 &&
    typeof markdown === 'string' &&
    markdown.length > 0 &&
    evidenceValid
    ? 1
    : 0;
}
