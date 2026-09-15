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

export type HeroSurfaceFitOptions =
  | {
      profile: 'cover';
      title: string;
      subtitle?: string;
      hasImage: boolean;
      peopleCount: number;
    }
  | {
      profile: 'section';
      title: string;
      subtitle?: string;
      hasImage: boolean;
    }
  | {
      profile: 'statement';
      title: string;
      body?: string;
      footer?: string;
      scale: 'hero' | 'display' | 'title';
    }
  | {
      profile: 'cta';
      title: string;
      subtitle?: string;
      footer?: string;
      actionLabels: string[];
    };

/**
 * Fixed-canvas occupancy policy for the four emphasis-surface adapters. Their
 * markup remains distinct; only their shared density decision crosses this seam.
 */
export function heroSurfaceFit(opts: HeroSurfaceFitOptions): SlideDensity {
  if (opts.profile === 'cover') {
    return densityFromScore(
      opts.title.length * (opts.hasImage ? 2.5 : 1.7) +
        visibleText(opts.subtitle).length +
        opts.peopleCount * 70,
      { compact: opts.hasImage ? 180 : 260, dense: opts.hasImage ? 320 : 440 },
    );
  }
  if (opts.profile === 'section') {
    return densityFromScore(
      opts.title.length * (opts.hasImage ? 2.3 : 1.6) + visibleText(opts.subtitle).length,
      { compact: opts.hasImage ? 170 : 240, dense: opts.hasImage ? 300 : 410 },
    );
  }
  if (opts.profile === 'statement') {
    return densityFromScore(
      opts.title.length * (opts.scale === 'display' ? 2.2 : 1.5) +
        visibleText(opts.body).length +
        visibleText(opts.footer).length * 0.8,
      { compact: 250, dense: 480 },
    );
  }
  return densityFromScore(
    opts.title.length * 2 +
      visibleText(opts.subtitle).length +
      visibleText(opts.footer).length * 0.7 +
      opts.actionLabels.reduce((total, label) => total + label.length, 0),
    { compact: 220, dense: 400 },
  );
}

export type SequenceFrameProfile = 'agenda' | 'timeline';

export type SequenceFrameItem = {
  label: string;
  description?: string | null;
};

type AgendaSequenceFrameFit = {
  density: SlideDensity;
  mode: 'centered' | 'fitted';
  crowded: boolean;
};

type TimelineSequenceFrameFit = {
  density: SlideDensity;
  mode: 'horizontal' | 'vertical';
  crowded: boolean;
};

type SequenceFrameOptions = {
  lead?: string;
  items: SequenceFrameItem[];
};

/**
 * One fixed-canvas fitting decision for labelled sequences. Agenda rows and
 * timeline steps share the same occupancy shape, while profile-specific limits
 * and geometry remain private to this module.
 */
export function sequenceFrameFit(
  opts: SequenceFrameOptions & { profile: 'agenda' },
): AgendaSequenceFrameFit;
export function sequenceFrameFit(
  opts: SequenceFrameOptions & { profile: 'timeline' },
): TimelineSequenceFrameFit;
export function sequenceFrameFit(
  opts: SequenceFrameOptions & { profile: SequenceFrameProfile },
): AgendaSequenceFrameFit | TimelineSequenceFrameFit {
  // Labels and descriptions are authored markdown strings. Measure the raw
  // strings because md() escapes tag-like text before it becomes visible;
  // visibleText() here would incorrectly erase copy that the renderer shows.
  const descriptionLengths = opts.items.map((item) => item.description?.length ?? 0);
  const totalDescriptionLength = descriptionLengths.reduce((sum, length) => sum + length, 0);
  const maxDescriptionLength = Math.max(0, ...descriptionLengths);
  const leadLength = visibleText(opts.lead).length;

  if (opts.profile === 'agenda') {
    const crowded =
      opts.items.length >= SLIDE_LIMITS.agenda.items.max - 2 ||
      totalDescriptionLength > SLIDE_LIMITS.agenda.description.max * 2 ||
      maxDescriptionLength > SLIDE_LIMITS.agenda.description.max / 2;
    const density = densityFromScore(
      leadLength * 0.6 +
        opts.items.reduce(
          (score, item) => score + item.label.length * 1.3 + (item.description?.length ?? 0),
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
    leadLength * 0.6 +
      opts.items.reduce(
        (score, item) => score + item.label.length * 1.2 + (item.description?.length ?? 0),
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
