export type LayoutViolation = {
  slide: number;
  selector: string;
  issue: 'footer-intersection' | 'missing' | 'overflow';
  verticalPx?: number;
  horizontalPx?: number;
  bottomPx?: number;
  footerTopPx?: number;
};

export class SlideLayoutValidationError extends Error {
  violations: LayoutViolation[];

  constructor(violations: LayoutViolation[]) {
    const slides = [...new Set(violations.map((violation) => violation.slide))].sort(
      (a, b) => a - b,
    );
    super(
      slides.length === 1
        ? `La slide ${slides[0]} contient trop de contenu pour être exportée.`
        : `Les slides ${slides.join(', ')} contiennent trop de contenu pour être exportées.`,
    );
    this.name = 'SlideLayoutValidationError';
    this.violations = violations;
  }
}

export function parseLayoutViolations(stderr: string): LayoutViolation[] {
  const start = stderr.indexOf('{');
  if (start < 0) return [];
  try {
    const parsed = JSON.parse(stderr.slice(start)) as {
      violations?: LayoutViolation[];
    };
    return Array.isArray(parsed.violations) ? parsed.violations : [];
  } catch {
    return [];
  }
}
