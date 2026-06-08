import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AI provider so no real network call happens. draftObject is replaced
// with a spy that returns a fixed object; the unit test asserts how the shared
// surface CALLS it (schema / system / model), never the gateway behavior.
vi.mock('../ai', () => ({
  DRAFT_MODEL: 'cc/claude-sonnet-4-6',
  draftObject: vi.fn(),
}));

import { DRAFT_MODEL, draftObject } from '../ai';
import {
  DRAFT_SYSTEM_PROMPT,
  SLIDES_SCHEMA,
  draftPresentationSlides,
} from '../draftPresentation';

const mockedDraftObject = vi.mocked(draftObject);

const slide = (blockType: string, title: string) => ({ blockType, title });

const valid3 = {
  slides: [slide('cover', 'A'), slide('statement', 'B'), slide('cta', 'C')],
};

describe('SLIDES_SCHEMA', () => {
  it('accepts a valid 3-slide payload', () => {
    expect(SLIDES_SCHEMA.safeParse(valid3).success).toBe(true);
  });

  it('rejects a 2-slide payload (min 3)', () => {
    const two = { slides: [slide('cover', 'A'), slide('cta', 'C')] };
    expect(SLIDES_SCHEMA.safeParse(two).success).toBe(false);
  });
});

describe('DRAFT_SYSTEM_PROMPT', () => {
  it('is a non-empty string naming every AI-draftable block', () => {
    expect(typeof DRAFT_SYSTEM_PROMPT).toBe('string');
    expect(DRAFT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    for (const name of [
      'cover',
      'section',
      'statement',
      'twoCols',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
    ]) {
      expect(DRAFT_SYSTEM_PROMPT).toContain(name);
    }
  });

  it('excludes the non-draftable markdown block', () => {
    expect(DRAFT_SYSTEM_PROMPT).not.toContain('markdown');
  });
});

describe('draftPresentationSlides()', () => {
  beforeEach(() => {
    mockedDraftObject.mockReset();
    mockedDraftObject.mockResolvedValue(valid3);
  });

  it('calls draftObject once with SLIDES_SCHEMA, DRAFT_SYSTEM_PROMPT and DRAFT_MODEL by default', async () => {
    const result = await draftPresentationSlides('un brief suffisamment long');

    expect(mockedDraftObject).toHaveBeenCalledTimes(1);
    const arg = mockedDraftObject.mock.calls[0]![0];
    expect(arg.schema).toBe(SLIDES_SCHEMA);
    expect(arg.system).toBe(DRAFT_SYSTEM_PROMPT);
    expect(arg.model).toBe(DRAFT_MODEL);
    expect(arg.prompt).toBe('un brief suffisamment long');
    expect(result).toBe(valid3);
  });

  it('uses the passed model when opts.model is given', async () => {
    await draftPresentationSlides('un brief suffisamment long', { model: 'cx/gpt-5' });

    const arg = mockedDraftObject.mock.calls[0]![0];
    expect(arg.model).toBe('cx/gpt-5');
  });
});
