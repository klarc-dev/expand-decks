import { describe, expect, it } from 'vitest';

import { uncoveredKeyPoints } from '../agents/structure';
import type { DeckDossier } from '../schemas';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';

const dossier: DeckDossier = {
  coreIdea: 'Lead with the conclusion.',
  audience: 'CLE lawyers',
  soWhat: 'Busy judges decide early.',
  keyPoints: [
    'Retrieval practice improves long-term retention',
    'Spaced repetition beats massed study',
    'Concrete examples ground abstract concepts',
  ],
  data: [],
  sources: [],
  rawBrief: '',
};

describe('uncoveredKeyPoints (Structure coverage gate)', () => {
  it('flags a key point with no matching stub', () => {
    const stubs: OutlineStub[] = [
      { blockType: 'cover', title: 'Title', intent: 'open' },
      {
        blockType: 'statement',
        title: 'Retrieval practice strengthens long-term retention',
        intent: 'explain the testing effect and retention gains',
      },
      {
        blockType: 'statement',
        title: 'Concrete examples ground abstract concepts',
        intent: 'use real examples to land abstractions',
      },
      { blockType: 'cta', title: 'Next', intent: 'close' },
    ];
    // "Spaced repetition beats massed study" has no home.
    const uncovered = uncoveredKeyPoints(dossier, stubs);
    expect(uncovered).toContain('Spaced repetition beats massed study');
    expect(uncovered).toHaveLength(1);
  });

  it('passes when every key point is covered', () => {
    const stubs: OutlineStub[] = [
      {
        blockType: 'statement',
        title: 'Retrieval practice improves long-term retention',
        intent: 'testing effect',
      },
      {
        blockType: 'statement',
        title: 'Spaced repetition beats massed study',
        intent: 'distributed practice',
      },
      {
        blockType: 'statement',
        title: 'Concrete examples ground abstract concepts',
        intent: 'examples',
      },
    ];
    expect(uncoveredKeyPoints(dossier, stubs)).toHaveLength(0);
  });
});
