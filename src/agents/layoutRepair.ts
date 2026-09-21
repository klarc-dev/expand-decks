import { SlideLayoutValidationError, type LayoutViolation } from '../lib/slideLayoutValidation';
import { mapWithConcurrency } from '../lib/concurrency';

export type RenderedLayout<TPng> = {
  pngs: TPng[];
  validateLayout: () => Promise<void>;
  cleanup: () => void;
};

type RewriteArgs<TSlide> = {
  slide: TSlide;
  slideIndex: number;
  instruction: string;
};

export type LayoutRepairOptions<TSlide, TPng> = {
  slides: TSlide[];
  maxRepairs: number;
  concurrency: number;
  render: (slides: TSlide[]) => Promise<RenderedLayout<TPng>>;
  rewrite: (args: RewriteArgs<TSlide>) => Promise<TSlide>;
  onRepair?: (event: { count: number; iteration: number }) => Promise<void>;
};

export type LayoutRepairResult<TSlide, TPng> = {
  slides: TSlide[];
  rendered: RenderedLayout<TPng>;
};

function uniqueSlideIndexes(violations: LayoutViolation[], slideCount: number): number[] {
  return [
    ...new Set(
      violations
        .map((violation) => violation.slide - 1)
        .filter((index) => index >= 0 && index < slideCount),
    ),
  ].sort((a, b) => a - b);
}

function violationDescription(violation: LayoutViolation): string {
  const measurements = [
    violation.verticalPx != null
      ? `${Math.ceil(violation.verticalPx)} px de débordement vertical`
      : '',
    violation.horizontalPx != null
      ? `${Math.ceil(violation.horizontalPx)} px de débordement horizontal`
      : '',
  ].filter(Boolean);
  const measurement = measurements.length > 0 ? ` (${measurements.join(', ')})` : '';

  switch (violation.issue) {
    case 'footer-intersection':
      return `le contenu empiète sur le pied de page dans ${violation.selector}${measurement}`;
    case 'text-clipping':
      return `du texte est coupé dans ${violation.selector}${measurement}`;
    case 'missing':
      return `la zone attendue ${violation.selector} est absente du rendu`;
    case 'overflow':
      return `le contenu déborde de ${violation.selector}${measurement}`;
  }
}

function repairInstruction(slideNumber: number, violations: LayoutViolation[]): string {
  const details = violations.map(violationDescription).join('; ');
  return [
    `Le rendu réel de la slide ${slideNumber} ne tient pas dans le canvas : ${details}.`,
    'Réduis nettement la densité sans ajouter de faits : raccourcis les formulations, supprime les répétitions et détails secondaires, diminue le nombre d’items si nécessaire, et conserve uniquement le message essentiel.',
    'Respecte le blockType imposé et toutes les limites du schéma.',
  ].join(' ');
}

/**
 * Render a complete deck, rewrite only slides rejected by the DOM layout
 * validator, and retry with a bounded repair budget. The successful render is
 * returned to avoid paying for a third export before visual scoring.
 */
export async function validateAndRepairLayout<TSlide, TPng>(
  options: LayoutRepairOptions<TSlide, TPng>,
): Promise<LayoutRepairResult<TSlide, TPng>> {
  let slides = options.slides;

  for (let iteration = 0; ; iteration += 1) {
    const rendered = await options.render(slides);
    try {
      await rendered.validateLayout();
      return { slides, rendered };
    } catch (error) {
      rendered.cleanup();
      if (!(error instanceof SlideLayoutValidationError)) throw error;
      if (iteration >= options.maxRepairs) throw error;

      const indexes = uniqueSlideIndexes(error.violations, slides.length);
      if (indexes.length === 0) throw error;

      await options.onRepair?.({ count: indexes.length, iteration: iteration + 1 });
      const next = [...slides];
      await mapWithConcurrency(indexes, options.concurrency, async (slideIndex) => {
        const slide = slides[slideIndex];
        if (slide === undefined) return;
        const violations = error.violations.filter(
          (violation) => violation.slide === slideIndex + 1,
        );
        next[slideIndex] = await options.rewrite({
          slide,
          slideIndex,
          instruction: repairInstruction(slideIndex + 1, violations),
        });
      });
      slides = next;
    }
  }
}
