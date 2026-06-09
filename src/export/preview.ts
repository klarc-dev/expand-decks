import { getRenderer, type SlideBlock } from './renderers';
import { slideTone } from './slideTone';

/**
 * Render a single slide block to preview HTML + layout name, node-free.
 *
 * Strips the per-slide frontmatter (---\nlayout: ...\n---) leaving only the
 * HTML, and extracts the layout name. Returns null for unknown block types.
 * Used by both client preview surfaces (preview/page.tsx, SlidePreview.tsx).
 *
 * Tone is resolved with no previous slide (single-slide preview), so it matches
 * what buildSlidesMd would produce for that block at the start of a deck.
 */
export function renderBlockPreview(block: SlideBlock): { html: string; layout: string } | null {
  const blockType = (block as { blockType: string }).blockType;
  const renderer = getRenderer(blockType);
  if (!renderer) return null;
  let md: string;
  try {
    md = renderer(block as never, { surface: slideTone(blockType, null) });
  } catch {
    // A renderer bug must degrade to "no preview", never crash the admin.
    return null;
  }
  const html = md.replace(/^---\n[\s\S]*?\n---\n*/, '');
  const layout = md.match(/^---\n[\s\S]*?layout:\s*(\S+)/)?.[1] ?? 'default';
  return { html, layout };
}
