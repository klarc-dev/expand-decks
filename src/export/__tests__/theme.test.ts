import { describe, expect, it } from 'vitest';

import { buildHeadmatter, buildThemeCss } from '../theme';

const brand = {
  primary: '#123456',
  secondary: '#abcdef',
  ink: '#111111',
  paper: '#ffffff',
  headingFont: 'Gilroy',
  bodyFont: 'Roboto',
};

describe('buildThemeCss', () => {
  it('returns empty string for null brand (base CSS stays authoritative)', () => {
    expect(buildThemeCss(null)).toBe('');
    expect(buildThemeCss(undefined)).toBe('');
  });

  it('returns empty string when any color is not a valid hex', () => {
    expect(buildThemeCss({ ...brand, primary: 'teal' })).toBe('');
    expect(buildThemeCss({ ...brand, paper: '#fff' })).toBe('');
  });

  it('emits a :root block mapping the 4 source colors onto token roots', () => {
    const css = buildThemeCss(brand);
    expect(css).toContain(':root {');
    expect(css).toContain('--k-teal: #123456;');
    expect(css).toContain('--k-rose: #abcdef;');
    expect(css).toContain('--k-ink: #111111;');
    expect(css).toContain('--k-paper: #ffffff;');
  });

  it('derives every shade from the source colors via color-mix (no stored shades)', () => {
    const css = buildThemeCss(brand);
    expect(css).toContain('--k-teal-700: color-mix(in srgb, #123456 75%, black);');
    expect(css).toContain('--k-teal-50: color-mix(in srgb, #123456 8%, white);');
    expect(css).toContain('--k-rose-soft: color-mix(in srgb, #abcdef 30%, white);');
    expect(css).toContain('--k-ink-soft: color-mix(in srgb, #111111 70%, white);');
    expect(css).toContain('--k-line: color-mix(in srgb, #123456 12%, transparent);');
  });
});

describe('buildHeadmatter', () => {
  const base = `theme: default
fonts:
  sans: Roboto
  provider: google
  local: Gilroy
htmlAttrs:
  lang: fr`;

  it('rewrites fonts and lang for the org/presentation', () => {
    const out = buildHeadmatter(
      base,
      { ...brand, headingFont: 'Roboto', bodyFont: 'Gilroy' },
      'en',
    );
    expect(out).toContain('sans: Gilroy');
    expect(out).toContain('local: Roboto');
    expect(out).toContain('lang: en');
  });

  it('leaves base untouched when brand and language are absent', () => {
    expect(buildHeadmatter(base, null)).toBe(base);
  });
});
