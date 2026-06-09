import type { MermaidBlockData } from '../../blocks/spec/mermaid';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { MermaidBlockData };

/**
 * Strip a leading/trailing markdown fence if an author pasted the full
 * ```mermaid … ``` block — we re-emit our own fence, so a nested one would
 * break Slidev's codeblock transform.
 */
function bareSource(source: string): string {
  return source
    .replace(/^\s*```[\w]*\s*\n/, '')
    .replace(/\n```\s*$/, '')
    .trim();
}

export function renderMermaid(block: MermaidBlockData, ctx?: RenderCtx): string {
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });

  // The mermaid source is emitted RAW (never through md()/escape()): Slidev
  // transforms a ```mermaid fenced codeblock into an SVG, and the fence must sit
  // at markdown level with blank lines around it (verified: it renders even when
  // nested inside the surrounding HTML wrapper as long as the blank lines hold).
  const source = bareSource(block.source ?? '');
  const diagram = source
    ? `<div class="k-mermaid">\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\n</div>`
    : '';

  const caption = block.caption ? `\n\n<p class="k-mermaid-caption">${md(block.caption)}</p>` : '';

  const bodyHtml = contentFrame(`${header}\n\n${diagram}${caption}`, { wFull: true });

  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
