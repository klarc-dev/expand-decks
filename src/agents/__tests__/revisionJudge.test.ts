import { describe, expect, it } from 'vitest';

import { buildRevisionJudgePrompt } from '../evals/revisionJudge';

describe('buildRevisionJudgePrompt', () => {
  it('judges the authored deck, not transient workflow dossier metadata', () => {
    const prompt = buildRevisionJudgePrompt({
      expectations: { mustPreserve: [['fact']] },
      initial: {
        dossier: { coreIdea: 'transient initial metadata' },
        slides: [{ blockType: 'statement', title: 'Initial fact' }],
      },
      final: {
        dossier: { coreIdea: 'rewritten transient metadata' },
        slides: [{ blockType: 'statement', title: 'Initial fact' }],
      },
    });

    expect(prompt).toContain('Initial fact');
    expect(prompt).not.toContain('transient initial metadata');
    expect(prompt).not.toContain('rewritten transient metadata');
  });
});
