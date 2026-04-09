import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderCardGrid, type CardGridBlockData } from './blocks/cardGrid';
import { renderCover, type CoverBlockData } from './blocks/cover';
import { renderCta, type CtaBlockData } from './blocks/cta';
import { renderEnd, type EndBlockData } from './blocks/end';
import { renderMarkdown, type MarkdownBlockData } from './blocks/markdown';
import { renderOffices, type OfficesBlockData } from './blocks/offices';
import { renderSection, type SectionBlockData } from './blocks/section';
import { renderStatement, type StatementBlockData } from './blocks/statement';
import { renderStats, type StatsBlockData } from './blocks/stats';
import { renderTestimonials, type TestimonialsBlockData } from './blocks/testimonials';
import { renderTwoCols, type TwoColsBlockData } from './blocks/twoCols';

export type SlideBlock =
  | CoverBlockData
  | SectionBlockData
  | StatementBlockData
  | TwoColsBlockData
  | CardGridBlockData
  | StatsBlockData
  | TestimonialsBlockData
  | OfficesBlockData
  | CtaBlockData
  | EndBlockData
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
  testimonials: renderTestimonials as (block: never) => string,
  offices: renderOffices as (block: never) => string,
  cta: renderCta as (block: never) => string,
  end: renderEnd as (block: never) => string,
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
    return renderer(block as never);
  });

  // Headmatter is wrapped in --- fences, then each slide is separated by ---
  const parts = [`---\ntitle: "${presentation.title}"\n${headmatter}\n---`, ...slidesMd];
  return parts.join('\n\n---\n') + '\n';
}
