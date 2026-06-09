import { describe, expect, it } from 'vitest';

import { buildFooterHeadmatter, buildFooterLayer, buildLogoLayer } from '../chrome';

const vars = { 'org.name': 'Klarc', title: 'Deck', date: '2026-06-08' };

describe('buildFooterHeadmatter', () => {
  it('emits a klarcFooter YAML line with templates + static vars when enabled', () => {
    const out = buildFooterHeadmatter(
      { enabled: true, left: '{org.name}', center: '', right: '{page} / {total}' },
      vars,
      null,
    );
    expect(out).toContain('klarcFooter:');
    const json = JSON.parse(out.replace(/^klarcFooter:\s*/, '').trim());
    expect(json.left).toBe('{org.name}');
    expect(json.right).toBe('{page} / {total}');
    expect(json.vars['org.name']).toBe('Klarc');
  });

  it('omits the footer block when disabled, but still emits the logo line', () => {
    const out = buildFooterHeadmatter({ enabled: false }, vars, '/media/logo.png');
    expect(out).not.toContain('klarcFooter:');
    expect(out).toContain('klarcLogo: "/media/logo.png"');
  });

  it('emits nothing when disabled and no logo', () => {
    expect(buildFooterHeadmatter({ enabled: false }, vars, null)).toBe('');
  });
});

describe('buildFooterLayer / buildLogoLayer', () => {
  it('generates a slide-bottom layer that resolves page/total live and respects hideChrome', () => {
    const layer = buildFooterLayer(true);
    expect(layer).toContain('useNav');
    expect(layer).toContain('currentPage');
    expect(layer).toContain('hideChrome');
    expect(layer).toContain('k-slide-footer');
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
