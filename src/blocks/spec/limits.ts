export interface RangeLimit {
  min: number;
  max: number;
}

export interface TextLimit {
  max: number;
}

/**
 * Canonical fixed-canvas authoring limits.
 *
 * These are presentation contracts, not renderer heuristics. Block specs project
 * them to render Zod, AI structured output, Payload fields, and generated prompt
 * guidance so every producer receives the same boundary.
 */
export const SLIDE_LIMITS = {
  common: {
    eyebrow: { max: 80 },
    title: { max: 180 },
    footnotes: { min: 0, max: 3, text: { max: 220 } },
  },
  cover: {
    subtitle: { max: 320 },
    speakers: { min: 0, max: 4 },
  },
  section: {
    number: { max: 8 },
    subtitle: { max: 280 },
  },
  statement: {
    body: { max: 560 },
    footer: { max: 220 },
  },
  twoCols: {
    intro: { max: 480 },
    leftFooter: { max: 220 },
    cards: { min: 1, max: 5 },
    cardTitle: { max: 120 },
    cardDescription: { max: 280 },
  },
  cardGrid: {
    sidebar: { max: 320 },
    cards: { min: 2, max: 8 },
    cardNumber: { max: 12 },
    cardTitle: { max: 120 },
    cardDescription: { max: 260 },
  },
  stats: {
    items: { min: 2, max: 4 },
    value: { max: 24 },
    label: { max: 140 },
  },
  quotes: {
    items: { min: 1, max: 4 },
    quote: { max: 380 },
    authorName: { max: 80 },
    authorRole: { max: 100 },
  },
  cta: {
    subtitle: { max: 280 },
    action: { max: 50 },
    footerNote: { max: 220 },
  },
  table: {
    columns: { min: 2, max: 5 },
    header: { max: 80 },
    rows: { min: 1, max: 8 },
    cell: { max: 420 },
  },
  timeline: {
    steps: { min: 2, max: 6 },
    label: { max: 70 },
    description: { max: 220 },
    footer: { max: 160 },
  },
  mermaid: {
    source: { max: 5_000 },
    caption: { max: 180 },
  },
  agenda: {
    items: { min: 2, max: 8 },
    label: { max: 70 },
    description: { max: 180 },
  },
  markdown: {
    layout: { max: 40 },
    frontmatter: { max: 4_000 },
    content: { max: 20_000 },
  },
} as const satisfies Record<
  string,
  Record<string, TextLimit | RangeLimit | Record<string, unknown>>
>;

export type SlideLimits = typeof SLIDE_LIMITS;
