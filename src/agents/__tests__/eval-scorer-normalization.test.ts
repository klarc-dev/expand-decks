import { describe, expect, it } from 'vitest';

import { deckContractScore, extractDeckOutput } from '../evals/scorers/deckContract';

const validDeck = {
  slides: [{ blockType: 'cover' }, { blockType: 'statement' }, { blockType: 'cta' }],
  md: '# deck',
  evidence: [],
};

describe('production deck scorer input normalization', () => {
  it('unwraps a successful Mastra workflow result before scoring', () => {
    const workflowResult = {
      status: 'success',
      result: validDeck,
      input: { brief: 'test' },
      steps: {},
    };

    expect(extractDeckOutput(workflowResult)).toEqual(validDeck);
    expect(
      deckContractScore(workflowResult, {
        minSlides: 3,
        maxSlides: 3,
        requiredBlockTypes: ['cover', 'cta'],
      }),
    ).toBe(1);
  });

  it('unwraps the workflow output after runEvals has wrapped it in run.output', () => {
    const scorerRun = {
      input: { brief: 'test' },
      output: {
        status: 'success',
        result: validDeck,
        input: { brief: 'test' },
        steps: {},
      },
    };

    expect(extractDeckOutput(scorerRun.output)).toEqual(validDeck);
    expect(deckContractScore(scorerRun.output)).toBe(1);
  });
});
