import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RENDERERS, type SlideBlock } from './renderers';
import { resetDefs } from './utils';

export type Presentation = {
  title: string;
  slides: SlideBlock[];
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
