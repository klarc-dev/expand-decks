import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderCardGrid, type CardGridBlockData } from './blocks/cardGrid';
import { renderCover, type CoverBlockData } from './blocks/cover';
import { renderCta, type CtaBlockData } from './blocks/cta';
import { renderMarkdown, type MarkdownBlockData } from './blocks/markdown';
import { renderQuotes, type QuotesBlockData } from './blocks/quotes';
import { renderSection, type SectionBlockData } from './blocks/section';
import { renderStatement, type StatementBlockData } from './blocks/statement';
import { renderStats, type StatsBlockData } from './blocks/stats';
import { renderTwoCols, type TwoColsBlockData } from './blocks/twoCols';
import { resetDefs } from './utils';

export type SlideBlock =
  | CoverBlockData
  | SectionBlockData
  | StatementBlockData
  | TwoColsBlockData
  | CardGridBlockData
  | StatsBlockData
  | QuotesBlockData
  | CtaBlockData
  | MarkdownBlockData;

export type Presentation = {
  title: string;
  slides: SlideBlock[];
};

const RENDERERS: Record<string, (block: never) => string> = {
  cover: renderCover as (block: never) => string,
  section: renderSection as (block: never) => string,
  statement: renderStatement as (block: never) => string,
  twoCols: renderTwoCols as (block: never) => string,
  cardGrid: renderCardGrid as (block: never) => string,
  stats: renderStats as (block: never) => string,
  quotes: renderQuotes as (block: never) => string,
  cta: renderCta as (block: never) => string,
  markdown: renderMarkdown as (block: never) => string,
};

let headmatterCache: string | null = null;

function loadHeadmatter(): string {
  if (headmatterCache) return headmatterCache;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const yamlPath = join(__dirname, 'headmatter.yaml');
  const content = readFileSync(yamlPath, 'utf-8').trim();
  headmatterCache = content;
  return content;
}

/**
 * Build a complete Slidev `slides.md` from a Presentation document.
 *
 * Pure function: same input always produces the same output.
 * The headmatter YAML is read once from disk and cached.
 */
export function buildSlidesMd(
  presentation: Presentation,
  options?: { headmatter?: string },
): string {
  const headmatter = options?.headmatter ?? loadHeadmatter();

  const slidesMd = presentation.slides.map((block) => {
    const renderer = RENDERERS[block.blockType];
    if (!renderer) {
      throw new Error(`Unknown block type: ${block.blockType}`);
    }
    resetDefs();
    return renderer(block as never);
  });

  // Each renderer's output already begins with `---` (its own frontmatter
  // open), which doubles as the Slidev slide separator. Joining with a blank
  // line is sufficient — adding another `---` would produce `---\n---\n` which
  // Slidev parses as an empty frontmatter block followed by content.
  const parts = [`---\ntitle: "${presentation.title}"\n${headmatter}\n---`, ...slidesMd];
  return parts.join('\n\n') + '\n';
}
