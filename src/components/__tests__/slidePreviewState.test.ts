import { describe, expect, it } from 'vitest';

import {
  previewRequestKey,
  selectBlockTypes,
  selectChromeFields,
  selectSectionTitles,
  selectSlideCount,
  selectSlideIndex,
  selectPreviewRequest,
  type FormFields,
} from '../slidePreviewState';

const fields: FormFields = {
  'slides.0.blockType': { value: 'cover' },
  'slides.0.title': { value: 'Cover' },
  'slides.2.blockType': { value: 'section' },
  'slides.2.title': { value: 'Plan' },
  'slides.1.blockType': { value: 'statement' },
  'slides.1.title': { value: 'Msg' },
  'footer.enabled': { value: true },
  'footer.left': { value: '{org.name}' },
  organisation: { value: 'org-1' },
  title: { value: 'Deck' },
  language: { value: 'fr' },
};

describe('slidePreviewState selectors', () => {
  it('returns block types in slide order', () => {
    expect(selectBlockTypes(fields)).toEqual(['cover', 'statement', 'section']);
  });

  it('returns section titles sorted by slide index', () => {
    expect(selectSectionTitles(fields)).toEqual(['Plan']);
  });

  it('derives slide index from the preview field path', () => {
    expect(selectSlideIndex('slides.2.preview')).toBe(2);
    expect(selectSlideIndex('weird')).toBe(0);
  });

  it('counts slides with a floor of 1', () => {
    expect(selectSlideCount(fields)).toBe(3);
    expect(selectSlideCount({})).toBe(1);
  });

  it('extracts only chrome-relevant fields', () => {
    const chrome = selectChromeFields(fields);
    expect(chrome).toMatchObject({ organisation: 'org-1', title: 'Deck', language: 'fr' });
    expect(chrome['footer.enabled']).toBe(true);
  });

  it('produces a stable request key for identical state', () => {
    const a = previewRequestKey(selectPreviewRequest(fields, 'slides.1.preview'));
    const b = previewRequestKey(selectPreviewRequest(fields, 'slides.1.preview'));
    expect(a).toBe(b);
  });

  it('keeps the request key stable when unrelated form fields change', () => {
    const before = previewRequestKey(selectPreviewRequest(fields, 'slides.1.preview'));
    const after = previewRequestKey(
      selectPreviewRequest(
        { ...fields, adminOnlyUnrelated: { value: 'draft note' } },
        'slides.1.preview',
      ),
    );
    expect(after).toBe(before);
  });

  it('changes the request key when a section title changes', () => {
    const before = previewRequestKey(selectPreviewRequest(fields, 'slides.1.preview'));
    const after = previewRequestKey(
      selectPreviewRequest(
        { ...fields, 'slides.2.title': { value: 'Roadmap' } },
        'slides.1.preview',
      ),
    );
    expect(before).not.toBe(after);
  });
});
