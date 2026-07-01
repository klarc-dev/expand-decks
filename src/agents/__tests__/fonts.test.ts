import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listGoogleFonts } = vi.hoisted(() => ({ listGoogleFonts: vi.fn() }));
const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }));

vi.mock('@/lib/googleFonts', () => ({ listGoogleFonts }));
vi.mock('../model', () => ({ generateStructured }));

import { chooseFontPairForBrief } from '../fonts';

describe('chooseFontPairForBrief', () => {
  beforeEach(() => {
    listGoogleFonts.mockReset();
    generateStructured.mockReset();
  });

  it('chooses a pair through the structured model using catalog families', async () => {
    listGoogleFonts.mockResolvedValue({
      live: true,
      fonts: [{ family: 'Inter' }, { family: 'Noto Sans Display' }, { family: 'Roboto Slab' }],
    });
    generateStructured.mockResolvedValue({ headingFont: 'Noto Sans Display', bodyFont: 'Inter' });

    await expect(chooseFontPairForBrief('Expert deck about tax strategy')).resolves.toEqual({
      headingFont: 'Noto Sans Display',
      bodyFont: 'Inter',
    });

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'font-pair',
        prompt: expect.stringContaining('Inter, Noto Sans Display, Roboto Slab'),
      }),
    );
  });

  it('falls back when fewer than two catalog families are available', async () => {
    listGoogleFonts.mockResolvedValue({ live: false, fonts: [{ family: 'Roboto' }] });

    await expect(chooseFontPairForBrief('Brief')).resolves.toEqual({
      headingFont: 'Gilroy',
      bodyFont: 'Roboto',
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
