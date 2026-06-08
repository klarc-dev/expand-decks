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

describe('draftPresentationSlides() — two-pass plan→fill', () => {
  const outline = {
    slides: [
      { blockType: 'cover', title: 'A', intent: 'i' },
      { blockType: 'statement', title: 'B', intent: 'i' },
      { blockType: 'cta', title: 'C', intent: 'i' },
    ],
  };

  beforeEach(() => {
    mockedDraftObject.mockReset();
    // First call = outline pass; subsequent calls = fill batches.
    mockedDraftObject
      .mockResolvedValueOnce(outline)
      .mockResolvedValue(valid3);
  });

  it('runs an outline pass then a fill pass (one batch for a short deck)', async () => {
    const result = await draftPresentationSlides('un brief suffisamment long');

    expect(mockedDraftObject).toHaveBeenCalledTimes(2);
    expect(result.slides).toHaveLength(3);
  });

  it('forces the planned blockType/title onto each filled slide', async () => {
    mockedDraftObject.mockReset();
    mockedDraftObject
      .mockResolvedValueOnce(outline)
      // model drifts: wrong blockType + missing title on first slide
      .mockResolvedValue({
        slides: [
          { blockType: 'stats', body: 'x' },
          { blockType: 'statement', title: 'Changed' },
          { blockType: 'cta', title: 'C' },
        ],
      });

    const result = await draftPresentationSlides('un brief suffisamment long');

    expect(result.slides[0]).toMatchObject({ blockType: 'cover', title: 'A' });
    expect(result.slides[1]).toMatchObject({ title: 'B' });
  });

  it('skips the LLM outline pass for explicit S1/S2/S3 briefs', async () => {
    mockedDraftObject.mockReset();
    mockedDraftObject.mockResolvedValue(valid3);

    const result = await draftPresentationSlides(`S1 — Titre\n« Titre réel de la présentation ».\nS2 — Arbre de décision\nQuestion de contrefaçon détectable.\nS3 — Q&R\nClôture`);

    expect(mockedDraftObject).toHaveBeenCalledTimes(1);
    expect(result.slides[0]!.blockType).toBe('cover');
    expect(result.slides[0]).toMatchObject({ title: 'Titre réel de la présentation' });
    expect(result.slides[1]!.blockType).toBe('cardGrid');
    expect(result.slides[2]!.blockType).toBe('cta');
  });

  it('passes the model through to both passes', async () => {
    await draftPresentationSlides('un brief suffisamment long', { model: 'cx/gpt-5' });

    for (const call of mockedDraftObject.mock.calls) {
      expect(call[0]!.model).toBe('cx/gpt-5');
    }
  });

  it('defaults to DRAFT_MODEL', async () => {
    await draftPresentationSlides('un brief suffisamment long');
    expect(mockedDraftObject.mock.calls[0]![0]!.model).toBe(DRAFT_MODEL);
  });
});
