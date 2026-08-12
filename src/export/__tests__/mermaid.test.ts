import { describe, expect, it } from 'vitest';

import { renderMermaid } from '../blocks/mermaid';

const src = 'flowchart TD\n  A[Brief] --> B{Decision}\n  B -->|Yes| C[Build]';

describe('renderMermaid', () => {
  it('emits the source inside a raw ```mermaid fence, unescaped (S3)', () => {
    const out = renderMermaid({
      blockType: 'mermaid',
      title: 'Workflow',
      eyebrow: null,
      source: src,
      caption: null,
    });
    expect(out).toContain('```mermaid');
    // Mermaid arrow/bracket syntax must survive verbatim — never HTML-escaped.
    expect(out).toContain('A[Brief] --> B{Decision}');
    expect(out).toContain('B -->|Yes| C[Build]');
    expect(out).not.toMatch(/&gt;|&lt;|&#39;|&amp;/);
    // Fence sits on its own lines (Slidev codeblock transform needs blank lines).
    // Sizing is handled centrally in CSS, so no per-slide `{scale}` hint is emitted.
    expect(out).toMatch(/\n\n```mermaid\n/);
    // Closing fence on its own line — followed by a blank line (when a caption
    // trails) or end of slide.
    expect(out).toMatch(/\n```(?:\n\n|\n?$)/);
  });

  it('strips an author-pasted outer fence so we never nest fences', () => {
    const out = renderMermaid({
      blockType: 'mermaid',
      title: 'X',
      eyebrow: null,
      source: '```mermaid\nflowchart LR\n  X --> Y\n```',
      caption: null,
    });
    expect(out).toContain('flowchart LR');
    expect((out.match(/```mermaid/g) ?? []).length).toBe(1);
  });

  it('renders nothing for the diagram body when source is empty (no crash)', () => {
    const out = renderMermaid({
      blockType: 'mermaid',
      title: 'Empty',
      eyebrow: null,
      source: '',
      caption: null,
    });
    expect(out).not.toContain('```mermaid');
    expect(out).toContain('Empty');
  });
});
