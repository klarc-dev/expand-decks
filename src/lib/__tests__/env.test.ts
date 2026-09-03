import { afterEach, describe, expect, it, vi } from 'vitest';

const KEY = 'GOOGLE_FONTS_API_KEY';
const previousKey = process.env[KEY];

async function loadEnv(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('../env');
}

describe('assertGoogleFontsKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    if (previousKey === undefined) delete process.env[KEY];
    else process.env[KEY] = previousKey;
  });

  it('refuses to boot in production without the key', async () => {
    delete process.env[KEY];
    const { assertGoogleFontsKey } = await loadEnv('production');

    expect(() => assertGoogleFontsKey()).toThrow(
      /Missing required environment variable GOOGLE_FONTS_API_KEY/,
    );
  });

  it('accepts a present key in production', async () => {
    process.env[KEY] = 'a-real-key';
    const { assertGoogleFontsKey } = await loadEnv('production');

    expect(() => assertGoogleFontsKey()).not.toThrow();
  });

  it('tolerates a missing key outside production', async () => {
    delete process.env[KEY];
    const { assertGoogleFontsKey } = await loadEnv('development');

    expect(() => assertGoogleFontsKey()).not.toThrow();
  });
});
