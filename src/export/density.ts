import { SLIDE_LIMITS } from '../blocks/spec/limits';

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

export type SequenceFrameProfile = 'agenda' | 'timeline';

export type SequenceFrameItem = {
  label: string;
  description?: string | null;
};

export type SequenceFrameFit = {
  density: SlideDensity;
  mode: 'centered' | 'fitted' | 'horizontal' | 'vertical';
  crowded: boolean;
};

/**
 * One fixed-canvas fitting decision for labelled sequences. Agenda rows and
 * timeline steps share the same occupancy shape, while profile-specific limits
 * and geometry remain private to this module.
 */
export function sequenceFrameFit(opts: {
  profile: SequenceFrameProfile;
  header?: string;
  items: SequenceFrameItem[];
}): SequenceFrameFit {
  const descriptionLengths = opts.items.map((item) => visibleText(item.description).length);
  const totalDescriptionLength = descriptionLengths.reduce((sum, length) => sum + length, 0);
  const maxDescriptionLength = Math.max(0, ...descriptionLengths);
  const headerLength = visibleText(opts.header).length;

  if (opts.profile === 'agenda') {
    const crowded =
      opts.items.length >= SLIDE_LIMITS.agenda.items.max - 2 ||
      totalDescriptionLength > SLIDE_LIMITS.agenda.description.max * 2 ||
      maxDescriptionLength > SLIDE_LIMITS.agenda.description.max / 2;
    const density = densityFromScore(
      headerLength * 0.6 +
        opts.items.reduce(
          (score, item) =>
            score + visibleText(item.label).length * 1.3 + visibleText(item.description).length,
          opts.items.length * 52,
        ),
      { compact: 360, dense: 620 },
    );
    return {
      density,
      mode: opts.items.length >= 4 || crowded ? 'fitted' : 'centered',
      crowded,
    };
  }

  const crowded =
    opts.items.length >= SLIDE_LIMITS.timeline.steps.max - 1 ||
    totalDescriptionLength > SLIDE_LIMITS.timeline.description.max * 2.35 ||
    maxDescriptionLength > SLIDE_LIMITS.timeline.description.max * 0.64;
  const density = densityFromScore(
    headerLength * 0.6 +
      opts.items.reduce(
        (score, item) =>
          score + visibleText(item.label).length * 1.2 + visibleText(item.description).length,
        opts.items.length * 65,
      ),
    { compact: 430, dense: 690 },
  );
  return {
    density,
    mode: crowded ? 'vertical' : 'horizontal',
    crowded,
  };
}

export type CardLayoutProfile = 'card-grid' | 'quotes' | 'two-cols' | 'two-cols-image';

export type CardFrameOccupancy = {
  header?: string;
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
  const profile = opts.profile;
  const maxItem = Math.max(0, ...opts.itemPressures);
  const count = opts.itemPressures.length;
  const occupancy = opts.occupancy ?? {};
  const length = (value: string | undefined) => visibleText(value).length;

  if (profile === 'card-grid') {
    const rows = Math.ceil(count / Math.max(opts.cols, 1));
    const normalLimit = opts.cols >= 4 ? 82 : opts.cols === 3 ? 112 : 320;
    const compactLimit = opts.cols >= 4 ? 122 : opts.cols === 3 ? 158 : 440;
    const score =
      maxItem +
      Math.max(0, rows - 2) * 24 +
      length(occupancy.header) * 0.6 +
      length(occupancy.people) * 0.45;
    return densityFromScore(score, { compact: normalLimit, dense: compactLimit });
  }

  if (profile === 'quotes') {
    const score =
      maxItem + length(occupancy.header) * 0.6 + length(occupancy.action) * 0.5 + count * 92;
    return densityFromScore(score, { compact: 300, dense: 470 });
  }

  const image = profile === 'two-cols-image';
  const score =
    maxItem +
    length(occupancy.header) * 0.6 +
    length(occupancy.intro) * 0.75 +
    length(occupancy.footer) * 0.7 +
    length(occupancy.people) * 0.65 +
    count * (image ? 72 : 58);
  return densityFromScore(score, {
    compact: image ? 250 : 310,
    // A three-card split with a prominent expert card reaches the fixed-canvas
    // limit before 520: the person card and header consume width-independent
    // height that the max-item score alone understates. Switch the whole slide
    // to the dense ladder early enough to preserve every card description.
    dense: image ? 430 : 450,
  });
}
