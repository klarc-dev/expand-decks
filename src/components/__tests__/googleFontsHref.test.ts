import { describe, expect, it } from 'vitest';

import { googleFontsHref } from '../SlideFrame';

describe('googleFontsHref', () => {
  it('returns null without fonts', () => {
    expect(googleFontsHref(undefined)).toBeNull();
  });

  it('skips the locally-bundled Gilroy family', () => {
    expect(googleFontsHref({ heading: 'Gilroy', body: 'Gilroy' })).toBeNull();
  });

  it('builds a CSS2 stylesheet for non-local families with display swap', () => {
    const href = googleFontsHref({ heading: 'Noto Sans Display', body: 'Inter' });
    expect(href).toContain('https://fonts.googleapis.com/css2?');
    expect(href).toContain('family=Inter:wght@400;600;700');
    expect(href).toContain('family=Noto+Sans+Display:wght@400;600;700');
    expect(href).toContain('display=swap');
  });
});
