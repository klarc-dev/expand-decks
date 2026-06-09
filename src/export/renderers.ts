import { renderCardGrid, type CardGridBlockData } from './blocks/cardGrid';
import { renderCover, type CoverBlockData } from './blocks/cover';
import { renderCta, type CtaBlockData } from './blocks/cta';
import { renderMarkdown, type MarkdownBlockData } from './blocks/markdown';
import { renderQuotes, type QuotesBlockData } from './blocks/quotes';
import { renderSection, type SectionBlockData } from './blocks/section';
import { renderStatement, type StatementBlockData } from './blocks/statement';
import { renderStats, type StatsBlockData } from './blocks/stats';
import { renderTable, type TableBlockData } from './blocks/table';
import { renderTimeline, type TimelineBlockData } from './blocks/timeline';
import { renderTwoCols, type TwoColsBlockData } from './blocks/twoCols';

export type SlideBlock =
  | CoverBlockData
  | SectionBlockData
  | StatementBlockData
  | TwoColsBlockData
  | CardGridBlockData
  | StatsBlockData
  | QuotesBlockData
  | CtaBlockData
  | TableBlockData
  | TimelineBlockData
  | MarkdownBlockData;

type Renderer = (block: never) => string;

// Exhaustive by construction: a SlideBlock with no renderer fails to compile.
export const RENDERERS = {
  cover: renderCover as Renderer,
  section: renderSection as Renderer,
  statement: renderStatement as Renderer,
  twoCols: renderTwoCols as Renderer,
  cardGrid: renderCardGrid as Renderer,
  stats: renderStats as Renderer,
  quotes: renderQuotes as Renderer,
  cta: renderCta as Renderer,
  table: renderTable as Renderer,
  timeline: renderTimeline as Renderer,
  markdown: renderMarkdown as Renderer,
} satisfies Record<SlideBlock['blockType'], Renderer>;

// Runtime lookup by an arbitrary string (callers handle the undefined case).
export function getRenderer(blockType: string): Renderer | undefined {
  return (RENDERERS as Record<string, Renderer>)[blockType];
}
