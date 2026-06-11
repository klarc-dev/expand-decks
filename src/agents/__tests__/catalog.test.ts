import { describe, it, expect } from 'vitest';
import { DRAFT_SYSTEM_PROMPT } from '../prompts/catalog';

describe('catalog DRAFT_SYSTEM_PROMPT', () => {
  it('is a non-empty string naming AI-draftable blocks', () => {
    expect(typeof DRAFT_SYSTEM_PROMPT).toBe('string');
    expect(DRAFT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    for (const name of [
      'cover',
      'agenda',
      'section',
      'statement',
      'twoCols',
      'timeline',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
      'table',
      'mermaid',
    ]) {
      expect(DRAFT_SYSTEM_PROMPT).toContain(name);
    }
  });
});
