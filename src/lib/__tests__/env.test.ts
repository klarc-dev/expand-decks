import { afterEach, describe, expect, it, vi } from 'vitest';

const KEY = 'GOOGLE_FONTS_API_KEY';
const AI_KEYS = [
  'CLIPROXYAPI_BASE_URL',
  'CLIPROXYAPI_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
] as const;
const previousKey = process.env[KEY];
const previousAI = Object.fromEntries(AI_KEYS.map((key) => [key, process.env[key]]));

function clearAIProviderConfig() {
  for (const key of AI_KEYS) delete process.env[key];
}

function restoreEnvironment() {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (previousKey === undefined) delete process.env[KEY];
  else process.env[KEY] = previousKey;
  for (const key of AI_KEYS) {
    const value = previousAI[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function loadEnv(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('../env');
}

describe('assertGoogleFontsKey', () => {
  afterEach(restoreEnvironment);

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

describe('assertAIProviderConfig', () => {
  afterEach(restoreEnvironment);

  it('refuses to boot in production without a provider URL and key', async () => {
    clearAIProviderConfig();
    const { assertAIProviderConfig } = await loadEnv('production');

    expect(() => assertAIProviderConfig()).toThrow(/Missing AI provider configuration/);
  });

  it('accepts CloudCLIProxy configuration in production', async () => {
    clearAIProviderConfig();
    process.env.CLIPROXYAPI_BASE_URL = 'https://proxy.example/v1';
    process.env.CLIPROXYAPI_KEY = 'secret';
    const { assertAIProviderConfig } = await loadEnv('production');

    expect(() => assertAIProviderConfig()).not.toThrow();
  });

  it('accepts OpenAI-compatible fallback configuration in production', async () => {
    clearAIProviderConfig();
    process.env.OPENAI_BASE_URL = 'https://openai-compatible.example/v1';
    process.env.OPENAI_API_KEY = 'secret';
    const { assertAIProviderConfig } = await loadEnv('production');

    expect(() => assertAIProviderConfig()).not.toThrow();
  });

  it('tolerates missing provider configuration outside production', async () => {
    clearAIProviderConfig();
    const { assertAIProviderConfig } = await loadEnv('development');

    expect(() => assertAIProviderConfig()).not.toThrow();
  });
});
