import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));

import { deckGroundingScorer, deckQualityScorer } from '../evals/scorers/quality';
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
    expect(instructions).toContain('connaissances générales établies');
    expect(instructions).toContain(
      "sont étayées même si la liste des faits autorisés n'est pas exhaustive",
    );
    expect(instructions).toContain("affirmations propres à l'auteur");
    expect(instructions).toContain("informations propres à l'auteur manquantes ou non confirmées");
  });

  it('keeps quality scoring orthogonal to explanatory grounding', async () => {
    mockedGenerateStructured.mockResolvedValue({
      score: 0.8,
      coverage: 0.9,
      progression: 0.8,
      nonRedundancy: 0.7,
      actionableConclusion: 0.8,
      reason: 'Coherent explanatory deck.',
    });

    await deckQualityScorer.run({
      input: { brief: 'Explain reversible and irreversible decisions to executives.' },
      output: { slides: [] },
      groundTruth: { allowedFacts: [], forbiddenClaims: [] },
    } as never);

    const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
    expect(instructions).toContain('connaissances générales établies');
    expect(instructions).toContain('exemples génériques clairement signalés');
    expect(instructions).toContain('juge de fondement séparé');
    expect(instructions).toContain('moyenne arithmétique');
  });
});
