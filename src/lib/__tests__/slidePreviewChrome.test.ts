import { describe, expect, it } from 'vitest';

import { buildSlidePreviewChrome } from '../slidePreviewChrome';

describe('buildSlidePreviewChrome()', () => {
  it('resolves the same live page/total footer tokens as Slidev preview chrome', () => {
    const chrome = buildSlidePreviewChrome(
      {
        title: { value: 'Deck title' },
        language: { value: 'fr' },
        organisation: {
          value: {
            name: 'Klarc',
            logo: { filename: 'logo.svg' },
            headingFont: 'Noto Sans Display',
            bodyFont: 'Inter',
          },
        },
        'footer.enabled': { value: true },
        'footer.left': { value: '{org.name}' },
        'footer.center': { value: '{title}' },
        'footer.right': { value: '{page} / {total}' },
        'slides.0.blockType': { value: 'cover' },
        'slides.1.blockType': { value: 'statement' },
      },
      'slides.1.preview',
      false,
    );

    expect(chrome.footer).toEqual({ left: 'Klarc', center: 'Deck title', right: '2 / 2' });
    expect(chrome.logoUrl).toBe('/media/logo.svg');
    expect(chrome.fonts).toEqual({ heading: 'Noto Sans Display', body: 'Inter' });
    expect(chrome.hidden).toBe(false);
  });

  it('swaps to the white logo on dark surfaces and back to colour on paper', () => {
    const fields = {
      organisation: {
        value: {
          name: 'Klarc',
          logo: { filename: 'logo.svg' },
          logoWhite: { filename: 'logo-white.svg' },
          logoBlack: { filename: 'logo-black.svg' },
        },
      },
      'slides.0.blockType': { value: 'statement' },
    };

    expect(buildSlidePreviewChrome(fields, 'slides.0.preview', false, true).logoUrl).toBe(
      '/media/logo-white.svg',
    );
    expect(buildSlidePreviewChrome(fields, 'slides.0.preview', false, false).logoUrl).toBe(
      '/media/logo.svg',
    );
  });

  it('falls back to the colour logo on dark surfaces when no white version exists', () => {
    const chrome = buildSlidePreviewChrome(
      { organisation: { value: { name: 'Klarc', logo: { filename: 'logo.svg' } } } },
      'slides.0.preview',
      false,
      true,
    );

    expect(chrome.logoUrl).toBe('/media/logo.svg');
  });

  it('keeps the final hideChrome behavior for cover, section, and CTA slides', () => {
    const chrome = buildSlidePreviewChrome(
      {
        'footer.enabled': { value: true },
        'slides.0.blockType': { value: 'cover' },
      },
      'slides.0.preview',
      true,
    );

    expect(chrome.hidden).toBe(true);
    expect(chrome.footer?.right).toBe('1 / 1');
  });

  it('exposes the organisation website so the logo and footer name link to it', () => {
    const withSite = buildSlidePreviewChrome(
      {
        organisation: { value: { name: 'Klarc', website: 'https://klarc.com' } },
        'slides.0.blockType': { value: 'statement' },
      },
      'slides.0.preview',
      false,
    );
    expect(withSite.orgUrl).toBe('https://klarc.com');
    const withoutSite = buildSlidePreviewChrome(
      { organisation: { value: { name: 'Klarc' } }, 'slides.0.blockType': { value: 'statement' } },
      'slides.0.preview',
      false,
    );
    expect(withoutSite.orgUrl).toBeUndefined();
  });

  it('omits the footer when disabled', () => {
    const chrome = buildSlidePreviewChrome(
      {
        'footer.enabled': { value: false },
        'slides.0.blockType': { value: 'statement' },
      },
      'slides.0.preview',
      false,
    );

    expect(chrome.footer).toBeUndefined();
  });
});
