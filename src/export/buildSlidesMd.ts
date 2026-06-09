import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARTIFACTS } from '../lib/paths';

import { getRenderer, type SlideBlock } from './renderers';
import { slideTone } from './slideTone';
import { resetDefs, yamlQuoted, type Surface } from './utils';

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
  options?: { headmatter?: string },
): string {
  const headmatter = options?.headmatter ?? loadHeadmatter();

  // Fold over slides carrying the previously-resolved tone, so slideTone can
  // alternate adjacent statements against their real neighbour (KTD5b). The
  // resolved tone is passed to each renderer as ctx.surface; a renderer with an
  // explicit block.surface field still wins (KTD5).
  let prevTone: Surface | null = null;
  const slidesMd = presentation.slides.map((block) => {
    const renderer = getRenderer(block.blockType);
    if (!renderer) {
      throw new Error(`Unknown block type: ${block.blockType}`);
    }
    const tone = slideTone(block.blockType, prevTone);
    prevTone = tone;
    resetDefs();
    return renderer(block as never, { surface: tone });
  });

  // Each renderer's output already begins with `---` (its own frontmatter
  // open), which doubles as the Slidev slide separator. Joining with a blank
  // line is sufficient — adding another `---` would produce `---\n---\n` which
  // Slidev parses as an empty frontmatter block followed by content.
  //
  // The first slide's frontmatter is merged into the headmatter block (as in
  // a hand-written Slidev deck): a standalone headmatter block would become
  // an empty phantom first slide in the built SPA / exported PDF.
  const headOpen = `---\ntitle: ${yamlQuoted(presentation.title)}\n${headmatter}`;

  if (slidesMd.length === 0) {
    return `${headOpen}\n---\n`;
  }

  const [first, ...rest] = slidesMd;
  const firstMatch = first!.match(/^---\n([\s\S]*?)\n---\n*/);
  const firstFm = firstMatch ? firstMatch[1] : '';
  const firstBody = firstMatch ? first!.slice(firstMatch[0].length) : first!;

  const head = `${headOpen}\n${firstFm}\n---\n\n${firstBody}`;
  return [head, ...rest].join('\n\n') + '\n';
}
