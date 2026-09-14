import { describe, expect, it } from 'vitest';

import {
  childRequestContext,
  createDeckRequestContext,
  DeckRequestContextSchema,
  withDeckLanguage,
} from '../requestContext';

describe('deck request context', () => {
  it('accepts only bounded correlation fields', () => {
    const values = DeckRequestContextSchema.parse({
      requestId: 'request-1',
      presentationId: 'presentation-1',
      runId: 'run-1',
      userId: 'user-1',
      phase: 'gather',
    });
    expect(values.phase).toBe('gather');
    expect(
      DeckRequestContextSchema.safeParse({ ...values, phase: 'unknown', brief: 'secret' }).success,
    ).toBe(false);
  });

  it('copies context for parallel phase changes without mutating the parent', () => {
    const parent = createDeckRequestContext({
      requestId: 'request-1',
      presentationId: 'presentation-1',
      runId: 'run-1',
      phase: 'gather',
    });
    const draft = childRequestContext(parent, 'draft');
    const visual = childRequestContext(parent, 'visual');
    expect(parent.get('phase')).toBe('gather');
    expect(draft.get('phase')).toBe('draft');
    expect(visual.get('phase')).toBe('visual');
  });

  it('propagates the output language to child phases', () => {
    const parent = createDeckRequestContext({
      requestId: 'request-1',
      presentationId: 'presentation-1',
      runId: 'run-1',
      language: 'en',
      phase: 'gather',
    });
    expect(childRequestContext(parent, 'draft').get('language')).toBe('en');
  });

  it('pins the resolved language on a copy without mutating the caller context', () => {
    const parent = createDeckRequestContext({
      requestId: 'request-1',
      presentationId: 'presentation-1',
      runId: 'run-1',
      model: 'high',
      language: 'en',
      phase: 'gather',
    });
    const pinned = withDeckLanguage(parent, 'fr');
    expect(pinned.get('language')).toBe('fr');
    expect(pinned.get('model')).toBe('high');
    expect(pinned.get('requestId')).toBe('request-1');
    expect(parent.get('language')).toBe('en');
    expect(withDeckLanguage(undefined, 'en').get('language')).toBe('en');
  });
});
