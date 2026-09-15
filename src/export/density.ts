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

export type CardLayoutProfile = 'card-grid' | 'quotes' | 'two-cols' | 'two-cols-image';

export type CardFrameOccupancy = {
  lead?: string;
  intro?: string;
  footer?: string;
  people?: string;
  action?: string;
};

/**
 * One fixed-canvas pressure model for every card stack. Renderers provide
 * rendered regions; the profile keeps weighting and thresholds private so a
 * fitting change has one owner instead of arithmetic in every caller.
 */
export function cardLayoutDensity(opts: {
  profile: CardLayoutProfile;
  itemPressures: number[];
  cols: number;
  occupancy?: CardFrameOccupancy;
}): SlideDensity {
  const maxItem = Math.max(0, ...opts.itemPressures);
  const count = opts.itemPressures.length;
  const occupancy = opts.occupancy ?? {};
  const length = (value: string | undefined) => visibleText(value).length;

  if (opts.profile === 'card-grid') {
    const rows = Math.ceil(count / Math.max(opts.cols, 1));
    const normalLimit = opts.cols >= 4 ? 82 : opts.cols === 3 ? 112 : 320;
    const compactLimit = opts.cols >= 4 ? 122 : opts.cols === 3 ? 158 : 440;
    const score =
      maxItem +
      Math.max(0, rows - 2) * 24 +
      length(occupancy.lead) * 0.6 +
      length(occupancy.people) * 0.45;
    return densityFromScore(score, { compact: normalLimit, dense: compactLimit });
  }

  if (opts.profile === 'quotes') {
    const score =
      maxItem + length(occupancy.lead) * 0.6 + length(occupancy.action) * 0.5 + count * 92;
    return densityFromScore(score, { compact: 300, dense: 470 });
  }

  const image = opts.profile === 'two-cols-image';
  const score =
    maxItem +
    length(occupancy.lead) * 0.6 +
    length(occupancy.intro) * 0.75 +
    length(occupancy.footer) * 0.7 +
    length(occupancy.people) * 0.65 +
    count * (image ? 72 : 58);
  return densityFromScore(score, {
    compact: image ? 250 : 310,
    dense: image ? 430 : 520,
  });
}
