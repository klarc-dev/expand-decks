import { describe, expect, it } from 'vitest';

import { deckGate } from '../evals/scorers';

describe('deckGate', () => {
  it('scores a valid deck as passing', async () => {
    const result = await deckGate.run({
      output: { slides: [{}, {}, {}], markdown: '# deck', evidence: [] },
    });
    expect(result.score).toBe(1);
  });
});
