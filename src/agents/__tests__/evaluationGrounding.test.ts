import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));

import { deckGroundingScorer } from '../evals/scorers/quality';
import { generateStructured } from '../model';

const mockedGenerateStructured = vi.mocked(generateStructured);

describe('deck grounding scorer instructions', () => {
  beforeEach(() => mockedGenerateStructured.mockReset());

  it('authorizes established explanatory knowledge while protecting specific facts', async () => {
    mockedGenerateStructured.mockResolvedValue({
      supportedRatio: 1,
      unsupportedClaims: [],
      missingConcepts: [],
      reason: 'Supported explanatory content.',
    });

    await deckGroundingScorer.run({
      input: {
        brief: "Explique le rôle et les prestations d'un avocat à une équipe commerciale.",
      },
      output: { slides: [] },
      groundTruth: { allowedFacts: [], forbiddenClaims: [] },
    } as never);

    const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
    expect(instructions).toContain('established general knowledge');
    expect(instructions).toContain(
      'is supported even when the allowed-facts list is not exhaustive',
    );
    expect(instructions).toContain('claims specific to the author');
    expect(instructions).toContain('missing or unconfirmed author-specific information');
  });
});
