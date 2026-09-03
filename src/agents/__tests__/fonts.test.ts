import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listGoogleFonts, TestUnavailableError } = vi.hoisted(() => ({
  listGoogleFonts: vi.fn(),
  TestUnavailableError: class TestUnavailableError extends Error {},
}));
const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }));

vi.mock('@/lib/googleFonts', () => ({
  listGoogleFonts,
  LOCAL_FONTS: [{ family: 'Gilroy', category: 'sans-serif' }],
  GoogleFontsUnavailableError: TestUnavailableError,
}));
vi.mock('../model', () => ({ generateStructured }));

import { chooseFontPairForBrief } from '../fonts';

describe('chooseFontPairForBrief', () => {
  beforeEach(() => {
    listGoogleFonts.mockReset();
    generateStructured.mockReset();
  });

  it('chooses a pair through the structured model using local + catalog families', async () => {
    listGoogleFonts.mockResolvedValue([
      { family: 'Inter' },
      { family: 'Noto Sans Display' },
      { family: 'Roboto Slab' },
    ]);
    generateStructured.mockResolvedValue({ headingFont: 'Noto Sans Display', bodyFont: 'Inter' });

    await expect(chooseFontPairForBrief('Expert deck about tax strategy')).resolves.toEqual({
      headingFont: 'Noto Sans Display',
      bodyFont: 'Inter',
    });

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'font-pair',
        prompt: expect.stringContaining('Gilroy, Inter, Noto Sans Display, Roboto Slab'),
      }),
    );
  });

  it('propagates catalog unavailability instead of substituting a stub pair', async () => {
    listGoogleFonts.mockRejectedValue(new TestUnavailableError('GOOGLE_FONTS_API_KEY is not set'));

    await expect(chooseFontPairForBrief('Brief')).rejects.toThrow(
      'GOOGLE_FONTS_API_KEY is not set',
    );
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('throws when the catalog is too small to form a pair', async () => {
    listGoogleFonts.mockResolvedValue([]);

    await expect(chooseFontPairForBrief('Brief')).rejects.toThrow(/at least 2/);
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
