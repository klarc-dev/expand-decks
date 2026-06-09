import type { MermaidBlockData } from '../../blocks/spec/mermaid';
import { md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

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

/**
 * Pick a Slidev mermaid {scale} so the diagram fits the ~26rem of vertical space
 * under the slide header on the 1280×720 canvas. Mermaid sizes a flowchart by
 * its node/row count; without down-scaling a tall `flowchart TD` overflows the
 * slide and gets clipped to near-blank in the PDF export. Heuristic by line
 * count (each edge/decl ≈ one row): more rows → smaller scale. Authors can still
 * pin an explicit scale by starting the source with a `%%{scale}%%`-style hint,
 * but the heuristic covers the common case with zero per-slide tuning.
 */
function autoScale(source: string): number {
  // Tight band (0.46–0.62) so sibling decision-tree slides render at a visually
  // CONSISTENT text size, and even a sparse 3-node TD tree (tall decision
  // diamonds) doesn't overflow the frame at the top of the range.
  const lines = source.split('\n').filter((l) => l.trim().length > 0).length;
  if (lines <= 4) return 0.62;
  if (lines <= 7) return 0.56;
  if (lines <= 10) return 0.42;
  return 0.36;
}

export function renderMermaid(block: MermaidBlockData, ctx?: RenderCtx): string {
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });

  const source = bareSource(block.source ?? '');
  const scale = autoScale(source);

  // CRITICAL: the ```mermaid fence is emitted at ROOT markdown level (NOT wrapped
  // in a <div>). Slidev's <Mermaid> transform only fires for a fence that sits at
  // markdown top level with blank lines around it; nesting it inside block-level
  // HTML leaves an empty <div class="mermaid"> and the diagram renders unsized /
  // outside the flow (verified: the HTML-wrapped form exported blank). The native
  // {scale} option is how Slidev sizes the SVG — no CSS height-hacking needed.
  const diagram = source ? `\`\`\`mermaid {scale: ${scale}}\n${source}\n\`\`\`` : '';

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
  const body = [header, diagram, caption].filter(Boolean).join('\n\n');

  const tone = surfaceClass(block.surface ?? ctx?.surface);
  return wrapSlide({ classAttr: `${tone} k-diagram-slide`, body });
}
