import { describe, expect, it } from 'vitest';

import { buildFooterHeadmatter, buildFooterLayer, buildLogoLayer } from '../chrome';

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

  it('omits the footer block when disabled, but still emits the logo line', () => {
    const out = buildFooterHeadmatter({ enabled: false }, '/media/logo.png');
    expect(out).not.toContain('klarcFooter:');
    expect(out).toContain('klarcLogo: "/media/logo.png"');
  });

  it('emits nothing when disabled and no logo', () => {
    expect(buildFooterHeadmatter({ enabled: false }, null)).toBe('');
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

  it('generates a logo layer guarding on url + hideChrome', () => {
    const layer = buildLogoLayer(true);
    expect(layer).toContain('k-slide-logo');
    expect(layer).toContain('hideChrome');
  });
});
