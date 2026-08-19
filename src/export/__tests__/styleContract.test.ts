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

  it('bounds overlong row text inside fitted agenda rows instead of pushing chrome', () => {
    expect(css).toMatch(/\.k-agenda--fit\s+\.k-ag-desc\s*\{[\s\S]*overflow:\s*hidden/);
    expect(css).toMatch(/-webkit-line-clamp:\s*2/);
  });
});

describe('style.css card grid composition (regression: floating sidebar note)', () => {
  it('structures cardGrid body as a full-height vertical system', () => {
    expect(css).toMatch(/\.k-cardgrid-body\s*\{[\s\S]*height:\s*100%/);
    expect(css).toMatch(/\.k-cardgrid-body\s*\{[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.k-cardgrid-body\s*>\s*\.k-card-stack\s*\{[\s\S]*flex:\s*1 1 auto/);
  });

  it('styles the lead as an in-flow reading band instead of a detached right note', () => {
    expect(css).toMatch(
      /\.k-cardgrid-lead\s*\{[\s\S]*border-left:\s*3px solid var\(--accent-rule\)/,
    );
    expect(css).toMatch(/\.k-cardgrid-lead\s*\{[\s\S]*max-width:\s*54rem/);
  });

  it('defines shared card-grid scales rather than per-card font sizes', () => {
    expect(css).toMatch(/\.k-card-scale-sm \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-sm \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card h3/);
    expect(css).toMatch(/\.k-card-scale-xs \.k-card p/);
    expect(css).toMatch(/\.k-card-scale-md\.k-grid-3/);
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
