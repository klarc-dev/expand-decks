import { describe, expect, it } from 'vitest';

import {
  applyPageNumberChrome,
  buildFooterHeadmatter,
  buildFooterLayer,
  buildLogoLayer,
  isDarkSurfaceClass,
  pickLogoUrl,
  resolveLogoUrls,
} from '../chrome';

describe('resolveLogoUrls', () => {
  it('shows the colour logo on paper and the white logo on dark surfaces', () => {
    const logos = resolveLogoUrls({
      logo: { filename: 'color.svg' },
      logoWhite: { filename: 'white.svg' },
      logoBlack: { filename: 'black.svg' },
    });
    expect(logos).toEqual({ light: '/media/color.svg', dark: '/media/white.svg' });
    expect(pickLogoUrl(logos, false)).toBe('/media/color.svg');
    expect(pickLogoUrl(logos, true)).toBe('/media/white.svg');
  });

  it('keeps the colour logo on every surface when it is the only upload', () => {
    expect(resolveLogoUrls({ logo: { filename: 'color.svg' } })).toEqual({
      light: '/media/color.svg',
      dark: '/media/color.svg',
    });
  });

  it('never puts a black logo on a dark surface or a white logo on paper', () => {
    expect(resolveLogoUrls({ logoBlack: { filename: 'black.svg' } })).toEqual({
      light: '/media/black.svg',
      dark: null,
    });
    expect(resolveLogoUrls({ logoWhite: { filename: 'white.svg' } })).toEqual({
      light: null,
      dark: '/media/white.svg',
    });
  });

  it('ignores unpopulated relationships and empty organisations', () => {
    expect(resolveLogoUrls({ logo: 12, logoWhite: null })).toEqual({ light: null, dark: null });
    expect(resolveLogoUrls(null)).toEqual({ light: null, dark: null });
    expect(pickLogoUrl(null, true)).toBeNull();
  });
});

describe('isDarkSurfaceClass', () => {
  it('detects the k-dark token that dark and gradient surfaces carry', () => {
    expect(isDarkSurfaceClass('relative k-dark')).toBe(true);
    expect(isDarkSurfaceClass('relative k-dark k-gradient')).toBe(true);
    expect(isDarkSurfaceClass('relative')).toBe(false);
    expect(isDarkSurfaceClass('k-darker')).toBe(false);
    expect(isDarkSurfaceClass(undefined)).toBe(false);
  });
});

describe('applyPageNumberChrome', () => {
  it('keeps footer content but clears the numbering slot when disabled by the template', () => {
    expect(
      applyPageNumberChrome(
        { enabled: true, left: 'Klarc', center: 'Confidential', right: '{page} / {total}' },
        false,
      ),
    ).toEqual({ enabled: true, left: 'Klarc', center: 'Confidential', right: '' });
  });

  it('preserves the configured numbering slot when enabled', () => {
    const footer = { enabled: true, right: '{page} / {total}' };
    expect(applyPageNumberChrome(footer, true)).toBe(footer);
  });
});

describe('buildFooterHeadmatter', () => {
  it('emits a klarcFooter YAML line with the (pre-resolved) templates when enabled', () => {
    // Static tokens are resolved by the caller; this helper just embeds the
    // strings and leaves {page}/{total} for the Vue layer.
    const out = buildFooterHeadmatter(
      { enabled: true, left: 'Klarc', center: '', right: '{page} / {total}' },
      null,
    );
    expect(out).toContain('klarcFooter:');
    const json = JSON.parse(out.replace(/^klarcFooter:\s*/, '').trim());
    expect(json.left).toBe('Klarc');
    expect(json.right).toBe('{page} / {total}');
    // no static-var payload is embedded anymore
    expect(json.vars).toBeUndefined();
  });

  it('omits the footer block when disabled, but still emits the logo variants', () => {
    const out = buildFooterHeadmatter(
      { enabled: false },
      { light: '/media/logo.png', dark: '/media/logo-white.png' },
    );
    expect(out).not.toContain('klarcFooter:');
    expect(out).toContain('klarcLogo: {"light":"/media/logo.png","dark":"/media/logo-white.png"}');
  });

  it('emits both the footer and the logo line when both apply', () => {
    const out = buildFooterHeadmatter(
      { enabled: true, left: 'Klarc', center: '', right: '' },
      { light: '/media/logo.png', dark: null },
    );
    expect(out).toContain('klarcFooter:');
    expect(out).toContain('klarcLogo: {"light":"/media/logo.png","dark":null}');
  });

  it('emits nothing when disabled and no logo', () => {
    expect(buildFooterHeadmatter({ enabled: false }, null)).toBe('');
    expect(buildFooterHeadmatter({ enabled: false }, { light: null, dark: null })).toBe('');
  });
});

describe('buildFooterLayer / buildLogoLayer', () => {
  it('generates a slide-bottom layer that resolves page/total from baked frontmatter and respects hideChrome', () => {
    const layer = buildFooterLayer(true);
    // page/total come from per-slide frontmatter (kPage/kTotal) baked by
    // buildSlidesMd, NOT live nav — this is what makes a single-pass PDF export
    // (no --per-slide) number correctly.
    expect(layer).toContain('$frontmatter?.kPage');
    expect(layer).toContain('$frontmatter?.kTotal');
    expect(layer).not.toContain('useNav');
    expect(layer).toContain('hideChrome');
    expect(layer).toContain('k-slide-footer');
    expect(layer).toContain('k-slide-footer--dark');
    expect(layer).toContain("includes('k-dark')");
    // only the page/total tokens remain in the Vue resolver
    expect(layer).toContain('page|total');
    expect(layer).not.toContain('cfg.value?.vars');
  });

  it('returns empty string when no footer/logo configured (file not written)', () => {
    expect(buildFooterLayer(false)).toBe('');
    expect(buildLogoLayer(false)).toBe('');
  });

  it('generates a logo layer that swaps the variant on the slide surface and respects hideChrome', () => {
    const layer = buildLogoLayer(true);
    expect(layer).toContain('k-slide-logo');
    expect(layer).toContain('hideChrome');
    expect(layer).toContain("includes('k-dark')");
    expect(layer).toContain('logos.value?.dark : logos.value?.light');
  });
});
