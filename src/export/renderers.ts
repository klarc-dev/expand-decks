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

export const RENDERERS: Record<string, (block: never) => string> = {
  cover: renderCover as (block: never) => string,
  section: renderSection as (block: never) => string,
  statement: renderStatement as (block: never) => string,
  twoCols: renderTwoCols as (block: never) => string,
  cardGrid: renderCardGrid as (block: never) => string,
  stats: renderStats as (block: never) => string,
  quotes: renderQuotes as (block: never) => string,
  cta: renderCta as (block: never) => string,
  table: renderTable as (block: never) => string,
  timeline: renderTimeline as (block: never) => string,
  markdown: renderMarkdown as (block: never) => string,
};
