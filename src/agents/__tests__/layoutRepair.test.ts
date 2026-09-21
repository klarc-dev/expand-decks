import { describe, expect, it, vi } from 'vitest';

import { SlideLayoutValidationError } from '../../lib/slideLayoutValidation';
import { validateAndRepairLayout } from '../layoutRepair';

type Slide = { title: string; body: string };

describe('validateAndRepairLayout', () => {
  it('rewrites only overflowing slides and validates the repaired deck', async () => {
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const validateFirst = vi.fn(async () => {
      throw new SlideLayoutValidationError([
        { slide: 2, selector: '.k-content-main', issue: 'overflow', verticalPx: 42 },
        { slide: 2, selector: '.k-card-stack', issue: 'footer-intersection' },
      ]);
    });
    const validateSecond = vi.fn(async () => undefined);
    const render = vi
      .fn()
      .mockResolvedValueOnce({
        pngs: ['first'],
        validateLayout: validateFirst,
        cleanup: firstCleanup,
      })
      .mockResolvedValueOnce({
        pngs: ['repaired'],
        validateLayout: validateSecond,
        cleanup: secondCleanup,
      });
    const rewrite = vi.fn(
      async ({ slide, instruction }: { slide: Slide; instruction: string }) => ({
        ...slide,
        body: 'Shortened',
        instruction,
      }),
    );
    const onRepair = vi.fn(async () => undefined);
    const slides: Slide[] = [
      { title: 'One', body: 'Fine' },
      { title: 'Two', body: 'Too dense' },
      { title: 'Three', body: 'Fine' },
    ];

    const result = await validateAndRepairLayout({
      slides,
      maxRepairs: 2,
      concurrency: 2,
      render,
      rewrite,
      onRepair,
    });

    expect(result.slides).toEqual([
      slides[0],
      expect.objectContaining({ title: 'Two', body: 'Shortened' }),
      slides[2],
    ]);
    expect(rewrite).toHaveBeenCalledTimes(1);
    expect(rewrite).toHaveBeenCalledWith(
      expect.objectContaining({
        slideIndex: 1,
        slide: slides[1],
        instruction: expect.stringMatching(/42 px.*pied de page/is),
      }),
    );
    expect(onRepair).toHaveBeenCalledWith({ count: 1, iteration: 1 });
    expect(render).toHaveBeenNthCalledWith(2, [
      slides[0],
      expect.objectContaining({ body: 'Shortened' }),
      slides[2],
    ]);
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).not.toHaveBeenCalled();
    expect(result.rendered.pngs).toEqual(['repaired']);
  });

  it('fails closed after the bounded repair budget is exhausted', async () => {
    const cleanup = vi.fn();
    const render = vi.fn(async () => ({
      pngs: [],
      validateLayout: async () => {
        throw new SlideLayoutValidationError([
          { slide: 1, selector: '.k-content-main', issue: 'text-clipping' },
        ]);
      },
      cleanup,
    }));
    const rewrite = vi.fn(async ({ slide }: { slide: Slide }) => slide);

    await expect(
      validateAndRepairLayout({
        slides: [{ title: 'One', body: 'Dense' }],
        maxRepairs: 2,
        concurrency: 2,
        render,
        rewrite,
      }),
    ).rejects.toThrow('slide 1 contient trop de contenu');

    expect(rewrite).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledTimes(3);
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it('does not reinterpret infrastructure export failures as content problems', async () => {
    const cleanup = vi.fn();
    const rewrite = vi.fn();

    await expect(
      validateAndRepairLayout({
        slides: [{ title: 'One', body: 'Fine' }],
        maxRepairs: 2,
        concurrency: 2,
        render: async () => ({
          pngs: [],
          validateLayout: async () => {
            throw new Error('Chromium crashed');
          },
          cleanup,
        }),
        rewrite,
      }),
    ).rejects.toThrow('Chromium crashed');

    expect(rewrite).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
