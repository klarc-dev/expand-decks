import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARTIFACTS } from '../lib/paths';
import { parseRenderSlides } from '../blocks/spec';

import { buildDeckRenderContexts } from './renderContext';
import { getRenderer, type SlideBlock } from './renderers';
import { resetDefs, seedFootnotes, yamlQuoted } from './utils';
import { setVarDoc } from './vars';

export type Presentation = {
  title: string;
  slides: SlideBlock[];
};

let headmatterCache: string | null = null;

function loadHeadmatter(): string {
  if (headmatterCache) return headmatterCache;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const yamlPath = join(__dirname, ARTIFACTS.headmatter);
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
  options?: { headmatter?: string; vars?: Record<string, unknown> },
): string {
  const headmatter = options?.headmatter ?? loadHeadmatter();

  // Dynamic {path} variables (e.g. {org.name}, {title}) resolve against this
  // context inside md()/applyDefs(). Set once; always cleared in finally so the
  // module-level ctx never leaks into the next build (mirrors resetDefs).
  setVarDoc(options?.vars ?? null);
  try {
    return foldSlides(presentation, headmatter);
  } finally {
    setVarDoc(null);
  }
}

function foldSlides(presentation: Presentation, headmatter: string): string {
  // Payload, seed scripts, migrations, and workflow output all converge here.
  // Validate once at the final render boundary so malformed or over-limit data
  // fails explicitly instead of reaching a renderer that may clip or omit it.
  const slides = parseRenderSlides(presentation.slides) as SlideBlock[];
  // One shared deck-context fold drives export and preview parity: tone chain,
  // statement variant rotation, agenda section derivation, and page totals.
  const contexts = buildDeckRenderContexts(slides);
  const slidesMd = slides.map((block, i) => {
    const renderer = getRenderer(block.blockType);
    if (!renderer) {
      throw new Error(`Unknown block type: ${block.blockType}`);
    }
    resetDefs();
    // Seed authored "Sources / Notes" before rendering so they're numbered
    // ahead of any inline {{def:…}} refs; markdown and cover blocks carry no
    // footnotes field and never flush the band.
    if (block.blockType !== 'markdown' && block.blockType !== 'cover') {
      seedFootnotes(
        (block as { footnotes?: ({ text?: string | null } | null)[] | null }).footnotes,
      );
    }
    return renderer(block as never, contexts[i]);
  });

  // Bake the 1-indexed page number and the deck total into each slide's
  // frontmatter (kPage / kTotal). Every renderer's output opens with `---\n`, so
  // injecting right after it lands inside the frontmatter fence. The mapping is
  // exactly one block → one slide → one exported page (no renderer emits an
  // internal slide separator, and these decks have no click steps), so the index
  // is the page number deterministically. The footer Vue layer reads these
  // instead of live nav state ($page/useNav), which is what previously forced the
  // PDF export to run with `--per-slide` (global currentPage stays stuck at 1 when
  // all slides render at once). With the numbers baked, a single-pass export is
  // correct — see buildSlidesRunner.
  const total = slides.length;
  const paged = slidesMd.map((slide, i) =>
    slide.replace(/^---\n/, `---\nkPage: ${i + 1}\nkTotal: ${total}\n`),
  );

  // Each renderer's output already begins with `---` (its own frontmatter
  // open), which doubles as the Slidev slide separator. Joining with a blank
  // line is sufficient — adding another `---` would produce `---\n---\n` which
  // Slidev parses as an empty frontmatter block followed by content.
  //
  // The first slide's frontmatter is merged into the headmatter block (as in
  // a hand-written Slidev deck): a standalone headmatter block would become
  // an empty phantom first slide in the built SPA / exported PDF.
  const headOpen = `---\ntitle: ${yamlQuoted(presentation.title)}\n${headmatter}`;

  if (paged.length === 0) {
    return `${headOpen}\n---\n`;
  }

  const [first, ...rest] = paged;
  const firstMatch = first!.match(/^---\n([\s\S]*?)\n---\n*/);
  const firstFm = firstMatch ? firstMatch[1] : '';
  const firstBody = firstMatch ? first!.slice(firstMatch[0].length) : first!;

  const head = `${headOpen}\n${firstFm}\n---\n\n${firstBody}`;
  return [head, ...rest].join('\n\n') + '\n';
}
