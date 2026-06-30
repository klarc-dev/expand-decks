import type { MermaidBlockData } from '../../blocks/spec/mermaid';
import { defFooterSlot, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { MermaidBlockData };

/**
 * Strip a leading/trailing markdown fence if an author pasted the full
 * ```mermaid … ``` block — we re-emit our own fence, so a nested one would
 * break Slidev's codeblock transform.
 */
export function bareMermaidSource(source: string): string {
  const bare = source
    .replace(/^\s*```[\w]*\s*\n/, '')
    .replace(/\n```\s*$/, '')
    .trim();
  if (/```|^---\s*$/m.test(bare)) {
    throw new Error('Mermaid source cannot contain markdown fences or slide separators');
  }
  return bare;
}

export function renderMermaid(block: MermaidBlockData, ctx?: RenderCtx): string {
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });

  const source = bareMermaidSource(block.source ?? '');

  // CRITICAL: the ```mermaid fence is emitted at ROOT markdown level (NOT wrapped
  // in a <div>). Slidev's <Mermaid> transform only fires for a fence that sits at
  // markdown top level with blank lines around it; nesting it inside block-level
  // HTML leaves an empty <div class="mermaid"> and the diagram renders unsized /
  // outside the flow (verified: the HTML-wrapped form exported blank). Sizing is
  // handled centrally by .k-diagram-slide CSS as a pure SVG "contain" layout, so
  // every diagram stays centered and clipped-free without per-slide scale hints.
  const diagram = source ? `\`\`\`mermaid\n${source}\n\`\`\`` : '';

  const caption = block.caption ? `<p class="k-mermaid-caption">${md(block.caption)}</p>` : '';

  // Header and caption are self-contained HTML blocks; the mermaid fence sits
  // BETWEEN them at root markdown level (NOT inside any wrapping <div> — that is
  // what broke the transform before: a fence nested in block-level HTML leaves
  // an empty <div class="mermaid">). Blank lines separate the three so
  // markdown-it treats the fence as a top-level code block.
  //
  // The k-diagram-slide class (added to the slide's own class attr) supplies the
  // horizontal inset + centers Slidev's emitted .mermaid output — done in CSS on
  // the slide root rather than a wrapper div, so the fence stays unwrapped.
  const body = [header, diagram, caption, defFooterSlot()].filter(Boolean).join('\n\n');

  const tone = surfaceClass(block.surface ?? ctx?.surface);
  return wrapSlide({ classAttr: `${tone} k-diagram-slide`, body });
}
