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

  it('makes the declared footer height authoritative, non-wrapping, and technical', () => {
    expect(css).toMatch(
      /\.k-slide-header,\s*\.k-slide-footer\s*\{[\s\S]*font-family:\s*var\(--k-font-technical\)/,
    );
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

  it('keeps closing-slide phone and email links clickable without underlines', () => {
    expect(css).toMatch(
      /\.slidev-layout \.k-location-card \.k-location-contact a\s*\{[^}]*text-decoration:\s*none/,
    );
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

  it('gives cover branding more weight and keeps long cover titles to a restrained scale', () => {
    const coverTitle = css.match(/\.slidev-layout \.k-cover \.k-hero-big\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(coverTitle).toContain('font-size: calc(var(--t-display) * 0.778)');
    expect(coverTitle).toContain('line-height: 0.98');

    const coverLogo =
      css.match(
        /\.slidev-page:has\(\.k-cover\)\s*>\s*\.k-slide-logo,[\s\S]*?\.slidev-page:has\(\.k-cover\)\s*>\s*\.k-slide-logo-link\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(coverLogo).toContain('height: 60px');
    expect(coverLogo).toContain('max-width: 220px');
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

  it('keeps secondary pills brand-pink with high-contrast ink text and dot on either surface', () => {
    const secondary = css.match(/\.k-eyebrow\.k-eyebrow--secondary\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(secondary).toContain('color: var(--k-ink)');
    expect(secondary).toContain('background: var(--k-rose)');
    expect(secondary).toContain('border-color: var(--k-rose)');
    expect(css).not.toMatch(/\.k-dark \.k-eyebrow\.k-eyebrow--secondary\s*\{/);
  });

  it('uses a precise, straight accent rule for professional title emphasis', () => {
    const mark = css.match(/\.slidev-layout \.k-mark\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(mark).toContain('color: inherit');
    expect(mark).toContain('position: relative');
    expect(mark).toContain('text-decoration: none');
    expect(mark).toContain('text-shadow: none');

    const underline = css.match(/\.slidev-layout \.k-mark::after\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(underline).toContain('background: var(--mark-rule)');
    expect(underline).toContain('border-radius: 1px');
    expect(underline).not.toContain('transform:');
    expect(underline).toMatch(/bottom:\s*-0\.08em/);
    expect(underline).toMatch(/height:\s*2px/);
  });

  it('keeps the eyebrow pill dot the same color as its text in every tone', () => {
    const dot = css.match(/\.k-eyebrow::before\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(dot).toMatch(/background:\s*currentColor/);
    expect(css).not.toMatch(/\.k-dark \.k-eyebrow::before\s*\{/);
  });

  it('uses one density contract for card typography and geometry', () => {
    expect(css).toMatch(/\.k-density-compact\s*\{[^}]*--card-title-scale:\s*0\.88/);
    expect(css).toMatch(/\.k-density-compact\s*\{[^}]*--card-body-scale:\s*0\.9/);
    expect(css).toMatch(/\.k-density-dense\s*\{[^}]*--card-title-scale:\s*0\.76/);
    expect(css).toMatch(/\.k-density-dense\s*\{[^}]*--card-body-scale:\s*0\.78/);
    expect(css).not.toContain('k-card-scale-');
  });

  it('uses an explicit numbered role for comfortable two-column cards', () => {
    expect(css).toMatch(
      /\.k-card-stack--grid\.k-grid-2:not\([^)]*\) \.k-card--numbered p\s*\{[^}]*font-size:\s*calc\(var\(--t-body\) \* 0\.95\)/,
    );
    expect(css).not.toContain(':has(> .k-num)');
  });

  it('uses smaller headings and even padding in comfortable numbered multirow cards', () => {
    expect(css).toMatch(
      /\.k-card-stack--grid\.k-grid-2\.k-card-stack--multirow:not\([^)]*\)[\s\S]*?> \.k-card--numbered\s*\{[^}]*--card-padding-block:\s*0\.9rem;[^}]*--card-padding-inline:\s*0\.9rem/,
    );
    expect(css).toMatch(/> \.k-card--numbered\s+h3\s*\{[^}]*font-size:\s*var\(--t-lead\)/);
  });

  it('gives multi-row comparable grids equal-height tracks through the shared stack', () => {
    expect(css).toMatch(/\.k-card-stack--multirow\s*\{[\s\S]*grid-auto-rows:\s*minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.k-card-stack--multirow\s*>\s*\.k-card\s*\{[\s\S]*height:\s*100%/);
  });
});

describe('style.css flat footnotes', () => {
  it('renders notes as a flat list instead of interactive-looking pills', () => {
    const footerBlock = css.match(/\.k-def-footer\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(footerBlock).toMatch(/display:\s*grid/);
    expect(footerBlock).not.toMatch(/border-top:/);

    const itemBlock = css.match(/\.k-def-item\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(itemBlock).toMatch(/border-radius:\s*0/);
    expect(itemBlock).toMatch(/background:\s*transparent/);
    expect(itemBlock).toMatch(/box-shadow:\s*none/);

    const textBlock = css.match(/\.k-def-text\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(textBlock).toMatch(/white-space:\s*normal/);
    expect(textBlock).not.toMatch(/overflow:\s*hidden|text-overflow:\s*ellipsis/);
  });

  it('uses transparent numerals with matching superscript calls in the content', () => {
    const indexBlock = css.match(/\.k-def-index\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(indexBlock).toMatch(/color:\s*var\(--k-rose\)/);
    expect(indexBlock).toMatch(/background:\s*transparent/);
    expect(indexBlock).toMatch(/border-radius:\s*0/);

    const refBlock = css.match(/\.k-def-ref\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(refBlock).toMatch(/color:\s*var\(--k-rose\)/);
    expect(refBlock).toMatch(/top:\s*-0\.35em/);
    expect(refBlock).toMatch(/background:\s*transparent/);
    const darkIndex = css.match(/\.k-dark \.k-def-index\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(darkIndex).toMatch(/background:\s*transparent/);
  });
});

describe('style.css link interaction contract', () => {
  it('keeps hover colors inside the organisation palette on light and dark slides', () => {
    expect(css).toMatch(
      /\.slidev-layout a:hover\s*\{[^}]*color:\s*var\(--k-teal\)[^}]*text-decoration-color:\s*currentColor/,
    );
    expect(css).toMatch(
      /\.slidev-layout\.k-dark a:hover,\s*\.slidev-layout \.k-dark a:hover\s*\{[^}]*color:\s*#fff[^}]*text-decoration-color:\s*currentColor/,
    );
    expect(css).toMatch(
      /\.slidev-layout a\s*\{[^}]*transition:[^}]*color var\(--k-motion-fast\)[^}]*text-decoration-color var\(--k-motion-fast\)/,
    );
    expect(css).toMatch(
      /\.slidev-layout \.k-btn:hover\s*\{[^}]*background:\s*var\(--k-teal-600\)[^}]*color:\s*#fff/,
    );
    expect(css).toMatch(
      /\.slidev-layout \.k-btn-ghost:hover\s*\{[^}]*color:\s*var\(--k-teal-700\)[^}]*background:\s*var\(--k-teal-50\)/,
    );
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
