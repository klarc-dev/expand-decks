import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetGoogleFontsCacheForTests,
  __setGoogleFontsNowForTests,
  buildWebfontsUrl,
  FALLBACK_FONTS,
  GOOGLE_FONTS_API_KEY_ENV,
  listGoogleFonts,
} from '../googleFonts';

const previousKey = process.env[GOOGLE_FONTS_API_KEY_ENV];

describe('googleFonts', () => {
  beforeEach(() => {
    __resetGoogleFontsCacheForTests();
    process.env[GOOGLE_FONTS_API_KEY_ENV] = 'test-key';
  });

  afterEach(() => {
    __resetGoogleFontsCacheForTests();
    if (previousKey === undefined) delete process.env[GOOGLE_FONTS_API_KEY_ENV];
    else process.env[GOOGLE_FONTS_API_KEY_ENV] = previousKey;
  });

  it('builds a Webfonts API URL with key, sort, and capability parameters', () => {
    expect(buildWebfontsUrl('abc', { sort: 'popularity', capability: 'VF' })).toBe(
      'https://www.googleapis.com/webfonts/v1/webfonts?key=abc&sort=popularity&capability=VF',
    );
  });

  it('returns fallback fonts when the API key is missing', async () => {
    delete process.env[GOOGLE_FONTS_API_KEY_ENV];

    await expect(listGoogleFonts()).resolves.toMatchObject({ fonts: FALLBACK_FONTS, live: false });
  });

  it('parses live font metadata including variable axes', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            family: 'Noto Sans Display',
            category: 'sans-serif',
            variants: ['regular', 'italic'],
            subsets: ['latin', 'latin-ext'],
            axes: [{ tag: 'wght', start: 100, end: 900 }],
          },
        ],
      }),
    }));

    await expect(listGoogleFonts({ fetchImpl })).resolves.toEqual({
      live: true,
      fonts: [
        {
          family: 'Noto Sans Display',
          category: 'sans-serif',
          variants: ['regular', 'italic'],
          subsets: ['latin', 'latin-ext'],
          axes: [{ tag: 'wght', start: 100, end: 900 }],
        },
      ],
    });
  });

  it('caches live results until TTL expiry', async () => {
    let clock = 1_000;
    __setGoogleFontsNowForTests(() => clock);
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ family: 'Roboto', variants: [], subsets: [] }] }),
    }));

    await listGoogleFonts({ fetchImpl, ttlMs: 500 });
    await listGoogleFonts({ fetchImpl, ttlMs: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    clock = 1_501;
    await listGoogleFonts({ fetchImpl, ttlMs: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
