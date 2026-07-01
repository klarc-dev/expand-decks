import { bareMermaidSource } from './blocks/mermaid';
import { getRenderer, type SlideBlock } from './renderers';
import { slideTone } from './slideTone';
import type { RenderCtx } from './utils';

type PreviewFrontmatter = {
  body: string;
  className: string;
  hideChrome: boolean;
  image?: string;
  layout: string;
};

function frontmatterValue(frontmatter: string, key: string): string | null {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return null;
  const value = match[1]?.trim() ?? '';
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parsePreviewFrontmatter(markdown: string): PreviewFrontmatter {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n*/);
  if (!match) {
    return { body: markdown, className: 'relative', hideChrome: false, layout: 'default' };
  }
  const frontmatter = match[1] ?? '';
  return {
    body: markdown.slice(match[0].length),
    className: frontmatterValue(frontmatter, 'class') ?? 'relative',
    hideChrome: frontmatterValue(frontmatter, 'hideChrome') === 'true',
    image: frontmatterValue(frontmatter, 'image') ?? undefined,
    layout: frontmatterValue(frontmatter, 'layout') ?? 'default',
  };
}

/**
 * Render a single slide block to preview HTML + layout name, node-free.
 *
 * Strips the per-slide frontmatter (---\nlayout: ...\n---) leaving only the
 * HTML, and extracts the same layout/class values Slidev applies to the final
 * slide frame. Returns null for unknown block types.
 * Used by both client preview surfaces (preview/page.tsx, SlidePreview.tsx).
 *
 * When `ctx` is supplied, it must come from the shared deck-context fold used by
 * buildSlidesMd so admin preview matches the slide's final position. Without it,
 * the function keeps a safe single-slide fallback for standalone callers.
 */
export function renderBlockPreview(
  block: SlideBlock,
  ctx?: RenderCtx,
): {
  className: string;
  html: string;
  hideChrome: boolean;
  image?: string;
  layout: string;
  mermaid?: { source: string };
} | null {
  const blockType = (block as { blockType: string }).blockType;
  const renderer = getRenderer(blockType);
  if (!renderer) return null;
  let md: string;
  let mermaid: { source: string } | undefined;
  try {
    md = renderer(block as never, ctx ?? { surface: slideTone(blockType, null), sections: [] });
    if (blockType === 'mermaid') {
      const source = bareMermaidSource((block as { source?: string | null }).source ?? '');
      if (source) mermaid = { source };
    }
  } catch {
    // A renderer bug must degrade to "no preview", never crash the admin.
    return null;
  }
  const parsed = parsePreviewFrontmatter(md);
  return {
    className: parsed.className,
    html: parsed.body,
    hideChrome: parsed.hideChrome,
    image: parsed.image,
    layout: parsed.layout,
    mermaid,
  };
}
