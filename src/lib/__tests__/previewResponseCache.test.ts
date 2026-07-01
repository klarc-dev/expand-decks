import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetPreviewResponseCacheForTests,
  __setPreviewResponseNowForTests,
  buildPreviewResponseCacheKey,
  getPreviewResponse,
  setPreviewResponse,
} from '../previewResponseCache';

const baseInput = {
  block: { blockType: 'statement', title: 'Msg' },
  blockTypes: ['cover', 'statement'],
  fields: { 'footer.left': '{org.name}', organisation: 'org-1' },
  previewFieldPath: 'slides.1.preview',
  sections: ['Plan'],
  slideIndex: 1,
  userId: 'u1',
};

describe('previewResponseCache', () => {
  beforeEach(() => __resetPreviewResponseCacheForTests());
  afterEach(() => __resetPreviewResponseCacheForTests());

  it('returns the cached value for an identical request under the same user', () => {
    const key = buildPreviewResponseCacheKey(baseInput);
    setPreviewResponse(key, { chrome: { footer: 1 }, preview: { html: 'x' } });
    expect(getPreviewResponse(key)).toEqual({ chrome: { footer: 1 }, preview: { html: 'x' } });
  });

  it('produces a different key for a different user', () => {
    const a = buildPreviewResponseCacheKey(baseInput);
    const b = buildPreviewResponseCacheKey({ ...baseInput, userId: 'u2' });
    expect(a).not.toBe(b);
  });

  it('produces a different key when the footer template changes', () => {
    const a = buildPreviewResponseCacheKey(baseInput);
    const b = buildPreviewResponseCacheKey({
      ...baseInput,
      fields: { ...baseInput.fields, 'footer.left': 'Changed' },
    });
    expect(a).not.toBe(b);
  });

  it('is stable regardless of field key ordering', () => {
    const a = buildPreviewResponseCacheKey(baseInput);
    const b = buildPreviewResponseCacheKey({
      ...baseInput,
      fields: { organisation: 'org-1', 'footer.left': '{org.name}' },
    });
    expect(a).toBe(b);
  });

  it('recomputes after TTL expiry', () => {
    let clock = 1000;
    __setPreviewResponseNowForTests(() => clock);
    const key = buildPreviewResponseCacheKey(baseInput);
    setPreviewResponse(key, { chrome: {}, preview: {} }, 2000);
    clock = 2500;
    expect(getPreviewResponse(key)).not.toBeNull();
    clock = 3001;
    expect(getPreviewResponse(key)).toBeNull();
  });
});
