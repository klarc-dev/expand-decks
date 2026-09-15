import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'style.css'), 'utf-8');

describe('style.css fixed-canvas safe frame', () => {
  it('derives every content bottom inset from the global footer exclusion zone', () => {
    expect(css).toMatch(/--chrome-footer-bottom:\s*1\.1rem/);
    expect(css).toMatch(/--chrome-footer-height:\s*1rem/);
    expect(css).toMatch(
      /--content-bottom:\s*calc\(\s*var\(--chrome-footer-bottom\)\s*\+\s*var\(--chrome-footer-height\)\s*\+\s*var\(--chrome-footer-gap\)\s*\)/,
    );
    expect(css).toMatch(/\.k-slide-footer\s*\{[\s\S]*bottom:\s*var\(--chrome-footer-bottom\)/);
  });

  it('uses one canonical safe-area padding contract across every template frame', () => {
    expect(css).toMatch(
      /\.k-markdown-slide,\s*\.k-content,\s*\.k-hero,\s*\.k-center-hero,\s*\.k-cover,\s*\.k-diagram-slide\s*\{[\s\S]*padding:\s*var\(--header-top\) var\(--content-inset\) var\(--content-bottom\)/,
    );
  });

  it('bounds every template frame to the fixed canvas so content cannot paint through chrome', () => {
    expect(css).toMatch(
      /\.k-markdown-slide,\s*\.k-content,\s*\.k-hero,\s*\.k-center-hero,\s*\.k-cover,\s*\.k-diagram-slide\s*\{[\s\S]*height:\s*100%/,
    );
    expect(css).toMatch(
      /\.k-markdown-slide,\s*\.k-content,\s*\.k-hero,\s*\.k-center-hero,\s*\.k-cover,\s*\.k-diagram-slide\s*\{[\s\S]*overflow:\s*clip/,
    );
  });

  it('constrains semantic main viewports inside the chrome-free safe area', () => {
    expect(css).toMatch(/\.k-content-main\s*\{[\s\S]*overflow:\s*clip/);
    expect(css).toMatch(/\.k-hero-main\s*\{[\s\S]*overflow:\s*clip/);
    expect(css).toMatch(/\.k-center-hero-main\s*\{[\s\S]*overflow:\s*clip/);
    expect(css).toMatch(/\.k-cover-main\s*\{[\s\S]*overflow:\s*clip/);
  });

  it('makes the declared footer height authoritative and non-wrapping', () => {
    expect(css).toMatch(/\.k-slide-footer\s*\{[\s\S]*height:\s*var\(--chrome-footer-height\)/);
    expect(css).toMatch(/\.k-slide-footer\s*\{[\s\S]*white-space:\s*nowrap/);
    expect(css).toMatch(/\.k-slide-footer\s*>\s*\*\s*\{[\s\S]*text-overflow:\s*ellipsis/);
  });

  it('centers section-title content against the full chrome-free canvas', () => {
    expect(css).toMatch(/\.k-section-frame\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.k-section-frame\s*\{[^}]*inset:\s*0/);
    expect(css).toMatch(/\.k-section-frame\s*\{[^}]*place-items:\s*center/);
    expect(css).toMatch(/\.k-section-frame\s*>\s*\.k-center-hero-main\s*\{[^}]*width:\s*100%/);
  });

  it('gives parallel location cards a distinct horizontal gutter', () => {
    expect(css).toMatch(/\.k-location-grid\s*\{[^}]*column-gap:\s*4rem/);
    expect(css).toMatch(/\.k-location-grid\s*\{[^}]*row-gap:\s*1\.5rem/);
  });

  it('centers the CTA with symmetric clearance and only the split copy within its body', () => {
    expect(css).toMatch(
      /\.k-cta-frame\s*\{[^}]*padding-block:\s*max\(var\(--header-top\), var\(--content-bottom\)\)/,
    );
    expect(css).toMatch(/\.k-split--body\s*\{[^}]*align-items:\s*start/);
    expect(css).toMatch(/\.k-split--body > \.k-copy-column\s*\{[^}]*align-self:\s*center/);
    expect(css).not.toMatch(/\.k-split--body > \.k-card-stack\s*\{[^}]*align-self:\s*center/);
  });
});

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
    expect(css).toMatch(/\.k-table\s*\{[\s\S]*table-layout:\s*fixed/);
    expect(css).toMatch(/\.k-table-stage\s*\{[\s\S]*max-width:\s*100%/);
    expect(css).toMatch(/\.k-table--cols-4 col:nth-child\(3\)\s*\{[\s\S]*width:\s*34%/);
    expect(css).toMatch(/\.k-table\.k-density-compact\s*\{[\s\S]*font-size:\s*calc/);
    expect(css).toMatch(/\.k-table\.k-density-dense\s*\{[\s\S]*font-size:\s*calc/);
    expect(css).not.toMatch(/\.k-table--fit\s*\{[\s\S]*font-size:\s*0\.5rem/);
    expect(css).toMatch(
      /\.k-table--fit th,[\s\S]*?\.k-table--fit td\s*\{[\s\S]*overflow-wrap:\s*break-word/,
    );
    expect(css).not.toMatch(/\.k-table--matrix td:not\(:first-child\)/);
    expect(css).toMatch(
      /\.k-dark \.k-btn-ghost\s*\{[\s\S]*border-color:\s*rgba\(255, 255, 255, 0\.58\)/,
    );
  });

  it('gives table stages an explicit measured-row boundary instead of relying on ancestor clipping', () => {
    expect(css).toMatch(/\.k-table-stage\s*\{[\s\S]*max-height:\s*100%/);
    expect(css).toMatch(/\.k-table-stage\s*\{[\s\S]*overflow:\s*clip/);
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

  it('applies density to slide headings and content spacing without moving the shared rails', () => {
    expect(css).toMatch(/\.k-content\.k-density-compact[\s\S]*row-gap:/);
    expect(css).toMatch(/\.k-content\.k-density-dense[\s\S]*row-gap:/);
    const denseFrame = css.match(/\.k-content\.k-density-dense\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(denseFrame).not.toMatch(/padding(?:-top)?:/);
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

  it('uses one fixed heading-description size across content, hero, cover, section, and CTA slides', () => {
    const token = css.match(/--t-heading-subtext:\s*([^;]+);/)?.[1]?.trim();
    expect(token).toBe('var(--t-lead)');
    expect(css).toMatch(
      /:is\(\.k-header-lead, \.k-hero-body, \.k-hero-sub, \.k-section-sub, \.k-cta-sub\)\s*\{[^}]*font-size:\s*var\(--t-heading-subtext\)/,
    );
    expect(css).not.toMatch(
      /\.k-(?:content|hero|center-hero|cover)\.k-density-(?:compact|dense)[^}]*\.k-(?:header-lead|hero-body|hero-sub|section-sub|cta-sub)[^{]*\{[^}]*font-size:/,
    );
  });

  it('keeps secondary pills subtly outlined with surface-aware secondary text', () => {
    const secondary = css.match(/\.k-eyebrow\.k-eyebrow--secondary\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(secondary).toContain('color: color-mix(in srgb, var(--k-rose) 50%, var(--k-ink))');
    expect(secondary).toContain('background: color-mix(in srgb, var(--k-rose) 4%, transparent)');
    expect(secondary).toContain('border-color: color-mix(in srgb, currentColor 35%, transparent)');
    expect(css).toMatch(/\.k-dark \.k-eyebrow\.k-eyebrow--secondary\s*\{\s*color: var\(--k-rose\)/);
  });

  it('keeps the eyebrow pill dot the same color as its text in every tone', () => {
    const dot = css.match(/\.k-eyebrow::before\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(dot).toMatch(/background:\s*currentColor/);
    expect(css).not.toMatch(/\.k-dark \.k-eyebrow::before\s*\{/);
  });

  it('defines shared card-grid scales rather than per-card font sizes', () => {
    expect(css).toMatch(/\.k-card-scale-sm \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-sm \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-md\.k-grid-3/);
  });

  it('uses the old dense/new comfortable midpoint only for numbered two-column descriptions', () => {
    const numberedBody = css.match(
      /\.k-card-scale-md\.k-grid-2\.k-card-stack--grid \.k-card:has\(> \.k-num\) p\s*\{([^}]*)\}/,
    )?.[1];
    expect(numberedBody).toMatch(/font-size:\s*calc\(var\(--t-body\) \* 0\.95\)/);
    expect(numberedBody).toMatch(/line-height:\s*1\.45/);
    // Preserve ordinary copy, unnumbered wide cards, and the density ladder.
    expect(css).toMatch(/\.k-card p\s*\{[^}]*font-size:\s*var\(--t-body\)/);
    expect(css).toMatch(
      /\.k-card-scale-md\.k-grid-2\.k-card-stack--grid \.k-card p\s*\{[^}]*font-size:\s*calc\(var\(--t-body\) \* 1\.12\)/,
    );
    expect(css).toMatch(
      /\.k-card-scale-sm \.k-card p\s*\{[^}]*font-size:\s*calc\(var\(--t-body\) \* 0\.9\)/,
    );
    expect(css).toMatch(
      /\.k-card-scale-xs \.k-card p\s*\{[^}]*font-size:\s*var\(--k-card-body-min\)/,
    );
  });

  it('reclaims vertical space only in comfortable numbered two-column multirow cards', () => {
    const scope = String.raw`\.k-card-scale-md\.k-grid-2\.k-card-stack--grid\.k-card-stack--multirow\s*>\s*\.k-card:has\(> \.k-num\)`;
    const card = css.match(new RegExp(`${scope}\\s*\\{([^}]*)\\}`))?.[1];
    const heading = css.match(new RegExp(`${scope}\\s+h3\\s*\\{([^}]*)\\}`))?.[1];
    expect(card).toMatch(/padding-block:\s*0\.5rem/);
    expect(heading).toMatch(/line-height:\s*1\.15/);
    expect(`${card}${heading}`).not.toMatch(/font-size|overflow|(?:^|;)\s*height:|line-clamp/);
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
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*min-height:\s*var\(--k-def-pill-h\)/);
    expect(css).toMatch(/\.k-def-item\s*\{[^}]*border:\s*0/);
    expect(css).toMatch(
      /\.k-def-item\s*\{[^}]*border-radius:\s*calc\(var\(--k-def-pill-h\) \/ 2\)/,
    );
    const textBlock = css.match(/\.k-def-text\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(textBlock).toMatch(/white-space:\s*normal/);
    expect(textBlock).not.toMatch(/overflow:\s*hidden|text-overflow:\s*ellipsis/);
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
