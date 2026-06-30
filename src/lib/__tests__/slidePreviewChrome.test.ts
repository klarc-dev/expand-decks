import { describe, expect, it } from 'vitest';

import { buildSlidePreviewChrome } from '../slidePreviewChrome';

describe('buildSlidePreviewChrome()', () => {
  it('resolves the same live page/total footer tokens as Slidev preview chrome', () => {
    const chrome = buildSlidePreviewChrome(
      {
        title: { value: 'Deck title' },
        language: { value: 'fr' },
        organisation: { value: { name: 'Klarc', logo: { filename: 'logo.svg' } } },
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
    expect(chrome.hidden).toBe(false);
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
