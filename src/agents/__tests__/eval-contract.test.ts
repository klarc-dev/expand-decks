import { describe, expect, it } from 'vitest';

import { deckContractScore } from '../evals/contract';

describe('deck eval contract', () => {
  const deck = { slides: [{}, {}, {}], markdown: '# deck', evidence: [] };

  it('accepts direct workflow output', () => {
    expect(deckContractScore(deck)).toBe(1);
    expect(deckContractScore({ slides: deck.slides, markdown: deck.markdown })).toBe(1);
  });

  it('accepts wrapped workflow results and successful step outputs', () => {
    expect(deckContractScore({ result: deck })).toBe(1);
    expect(deckContractScore({ steps: { done: { status: 'success', output: deck } } })).toBe(1);
  });

  it('rejects incomplete output', () => {
    expect(deckContractScore({ slides: [] })).toBe(0);
  });
});
