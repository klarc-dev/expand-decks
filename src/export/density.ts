export type SlideDensity = 'comfortable' | 'compact' | 'dense';

/** Convert rendered HTML/rich text to a stable approximation of visible copy. */
export function visibleText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Select one scale for a whole slide region. The densest comparable content
 * determines the shared scale; individual cards/cells are never fitted alone.
 */
export function densityFromScore(
  score: number,
  thresholds: { compact: number; dense: number },
): SlideDensity {
  if (score >= thresholds.dense) return 'dense';
  if (score >= thresholds.compact) return 'compact';
  return 'comfortable';
}

export function densityClass(density: SlideDensity): string {
  return density === 'comfortable' ? '' : `k-density-${density}`;
}

export function longestVisibleText(values: Array<string | null | undefined>): number {
  return Math.max(0, ...values.map((value) => visibleText(value).length));
}

export function totalVisibleText(values: Array<string | null | undefined>): number {
  return values.reduce((total, value) => total + visibleText(value).length, 0);
}

export function cardScaleClass(density: SlideDensity): string {
  return density === 'dense'
    ? 'k-card-scale-xs'
    : density === 'compact'
      ? 'k-card-scale-sm'
      : 'k-card-scale-md';
}
