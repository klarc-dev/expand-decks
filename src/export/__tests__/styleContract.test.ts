import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'style.css'), 'utf-8');

describe('style.css richText normalization (regression: cover footerLeft circle)', () => {
  it('collapses the .payload-richtext wrapper so it does not inflate inline pills', () => {
    expect(css).toMatch(/\.payload-richtext\s*\{\s*display:\s*contents/);
  });

  it('zeroes paragraph margins inside richText so single-line containers stay flush', () => {
    expect(css).toMatch(/\.payload-richtext\s*>\s*p\s*\{\s*margin:\s*0/);
  });

  it('keeps richText pill/footer labels readable on dark surfaces (no white-on-white)', () => {
    expect(css).toMatch(/\.k-btn\s+p[\s\S]*?\{\s*color:\s*inherit/);
  });
});

describe('style.css fitted agenda layout (regression: agenda rows overflow footer)', () => {
  it('lets fitted agenda rows share the measured content row height', () => {
    expect(css).toMatch(/\.k-agenda--fit\s*\{[\s\S]*height:\s*100%/);
    expect(css).toMatch(/\.k-agenda--fit\s+\.k-ag-item\s*\{[\s\S]*flex:\s*1 1 0/);
    expect(css).toMatch(/\.k-agenda--fit\s+\.k-ag-item\s*\{[\s\S]*min-height:\s*0/);
  });

  it('fits complete agenda copy through shared density rather than truncation', () => {
    expect(css).toMatch(/\.k-agenda--fit\.k-density-compact \.k-ag-item/);
    expect(css).toMatch(/\.k-agenda--fit\.k-density-dense \.k-ag-desc/);
    expect(css).not.toMatch(/\.k-agenda--fit \.k-ag-desc\s*\{[\s\S]*-webkit-line-clamp/);
  });
});

describe('style.css oversized export fitting', () => {
  it('fits dense tables inside the measured content row with a readable shared scale', () => {
    expect(css).toMatch(/\.k-table--fit\s*\{[\s\S]*table-layout:\s*fixed/);
    expect(css).toMatch(/\.k-table\.k-density-compact\s*\{[\s\S]*font-size:\s*calc/);
    expect(css).toMatch(/\.k-table\.k-density-dense\s*\{[\s\S]*font-size:\s*calc/);
    expect(css).not.toMatch(/\.k-table--fit\s*\{[\s\S]*font-size:\s*0\.5rem/);
    expect(css).toMatch(
      /\.k-table--fit th,[\s\S]*?\.k-table--fit td\s*\{[\s\S]*overflow-wrap:\s*anywhere/,
    );
  });

  it('makes Slidev Mermaid SVG dimensions yield to the fixed diagram stage', () => {
    expect(css).toMatch(/\.k-diagram-slide \.mermaid svg\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.k-diagram-slide \.mermaid svg\s*\{[\s\S]*min-height:\s*0/);
    expect(css).toMatch(/\.k-diagram-slide \.mermaid svg\s*\{[\s\S]*object-fit:\s*contain/);
    expect(css).toMatch(/\.k-diagram-slide \.mermaid \.edgeLabel rect,[\s\S]*fill:\s*#ffffff/);
    expect(css).toMatch(
      /\.k-diagram-slide \.mermaid \.edgeLabel span,[\s\S]*background-color:\s*#ffffff/,
    );
  });
});

describe('style.css shared density system', () => {
  it('defines compact and dense fixed-canvas scales once', () => {
    expect(css).toMatch(/\.k-density-compact\s*\{[\s\S]*--density-scale:\s*0\.88/);
    expect(css).toMatch(/\.k-density-dense\s*\{[\s\S]*--density-scale:\s*0\.76/);
    expect(css).toMatch(/\.k-stat-grid\.k-density-compact \.k-stat \.val/);
    expect(css).toMatch(/\.k-stat-grid\.k-density-dense \.k-stat \.val/);
    expect(css).toMatch(/\.k-stat\s*\{[\s\S]*grid-template-rows:/);
    expect(css).toMatch(/\.k-stat-grid\.k-density-compact \.k-stat\s*\{[\s\S]*grid-template-rows:/);
    expect(css).toMatch(/\.k-stat-grid\.k-density-dense \.k-stat\s*\{[\s\S]*grid-template-rows:/);
  });

  it('applies density to slide headings and content spacing as a group', () => {
    expect(css).toMatch(/\.k-content\.k-density-compact[\s\S]*row-gap:/);
    expect(css).toMatch(/\.k-content\.k-density-dense[\s\S]*padding-top:/);
    expect(css).toMatch(/\.k-hero\.k-density-dense \.k-hero-title/);
    expect(css).toMatch(/\.k-hero--center \.k-hero-body\s*\{[\s\S]*margin-left:\s*auto/);
  });
});

describe('style.css card grid composition (regression: floating sidebar note)', () => {
  it('structures cardGrid body as a full-height vertical system', () => {
    expect(css).toMatch(/\.k-cardgrid-body\s*\{[\s\S]*height:\s*100%/);
    expect(css).toMatch(/\.k-cardgrid-body\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.k-cardgrid-body\s*>\s*\.k-card-stack\s*\{[\s\S]*flex:\s*1 1 auto/);
    expect(css).toMatch(/\.k-card-stack--grid\s*\{[\s\S]*align-content:\s*center/);
    expect(css).toMatch(/\.k-card-stack--grid\s*\{[\s\S]*grid-auto-rows:\s*auto/);
  });

  it('styles the lead as an in-flow reading band instead of a detached right note', () => {
    expect(css).toMatch(
      /\.k-cardgrid-lead\s*\{[\s\S]*border-top:\s*1px solid var\(--accent-rule\)/,
    );
    expect(css).not.toMatch(/\.k-cardgrid-lead\s*\{[\s\S]*border-left:\s*3px/);
    expect(css).toMatch(/\.k-cardgrid-lead\s*\{[\s\S]*max-width:\s*54rem/);
  });

  it('defines shared card-grid scales rather than per-card font sizes', () => {
    expect(css).toMatch(/\.k-card-scale-sm \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-sm \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-md\.k-grid-3/);
  });

  it('gives multi-row comparable grids equal-height tracks through the shared stack', () => {
    expect(css).toMatch(/\.k-card-stack--multirow\s*\{[\s\S]*grid-auto-rows:\s*minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.k-card-stack--multirow\s*>\s*\.k-card\s*\{[\s\S]*height:\s*100%/);
  });
});

describe('style.css source pills', () => {
  it('renders source items as rounded integrated pills instead of a ruled footer', () => {
    const footerBlock = css.match(/\.k-def-footer\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(footerBlock).toMatch(/gap:\s*0\.32rem/);
    // No detached legal-footer rule above the band.
    expect(footerBlock).not.toMatch(/border-top:/);
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*display:\s*inline-grid/);
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*height:\s*var\(--k-def-pill-h\)/);
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*border:\s*0/);
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*border-radius:\s*999px/);
  });

  it('uses a full-height merged number segment inside each source pill', () => {
    expect(css).toMatch(/\.k-def-index\s*\{[\s\S]*display:\s*inline-flex/);
    expect(css).toMatch(/\.k-def-index\s*\{[\s\S]*height:\s*100%/);
    expect(css).toMatch(/\.k-def-index\s*\{[\s\S]*border-radius:\s*999px 0 0 999px/);
    expect(css).toMatch(/\.k-def-index\s*\{[\s\S]*background:\s*linear-gradient\(/);
    expect(css).toMatch(/\.k-def-index\s*\{[\s\S]*var\(--accent-rule\)/);
  });
});

describe('style.css corporate flat rendering', () => {
  it('uses the same shadowless and filterless system in SPA and PDF', () => {
    expect(css).toMatch(/\.slidev-layout \*,[\s\S]*?box-shadow:\s*none !important/);
    expect(css).toMatch(/\.slidev-layout \*,[\s\S]*?filter:\s*none !important/);
    expect(css).not.toMatch(/@media print/);
  });

  it('uses opaque surfaces for dark corporate components', () => {
    expect(css).toMatch(/\.k-dark \.k-person-card,[\s\S]*?background:\s*#[0-9a-f]{6} !important/i);
    expect(css).toMatch(
      /\.k-dark \.k-table tbody tr:nth-child\(even\)[\s\S]*?background:\s*#[0-9a-f]{6}/i,
    );
    expect(css).toMatch(/\.k-gradient\s*\{\s*background:\s*var\(--k-teal\) !important/);
    expect(css).not.toMatch(/\.k-gradient\s*\{[\s\S]*?radial-gradient/);
  });
});
