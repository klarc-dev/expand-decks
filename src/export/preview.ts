import { getRenderer, type SlideBlock } from './renderers';

/**
 * Render a single slide block to preview HTML + layout name, node-free.
 *
 * Strips the per-slide frontmatter (---\nlayout: ...\n---) leaving only the
 * HTML, and extracts the layout name. Returns null for unknown block types.
 * Used by both client preview surfaces (preview/page.tsx, SlidePreview.tsx).
 */
export function renderBlockPreview(
  block: SlideBlock,
): { html: string; layout: string } | null {
  const renderer = getRenderer((block as { blockType: string }).blockType);
  if (!renderer) return null;
  let md: string;
  try {
    md = renderer(block as never);
  } catch {
    // A renderer bug must degrade to "no preview", never crash the admin.
    return null;
  }
  const html = md.replace(/^---\n[\s\S]*?\n---\n*/, '');
  const layout = md.match(/^---\n[\s\S]*?layout:\s*(\S+)/)?.[1] ?? 'default';
  return { html, layout };
}
