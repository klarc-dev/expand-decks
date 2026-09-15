import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync('src/export/style.css', 'utf8');

describe('content-slide heading measure', () => {
  it('limits titles to 60% of the content rail and balances their lines', () => {
    const rule =
      css.match(/\.k-content-header h1,\s*\.k-content-header h2\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toMatch(/max-inline-size:\s*60%/);
    expect(rule).toMatch(/text-wrap:\s*balance/);
  });

  it('limits subtitles to 50% of the content rail and wraps them cleanly', () => {
    const rule = css.match(/\.k-header-lead\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toMatch(/max-inline-size:\s*min\(50%,\s*54rem\)/);
    expect(rule).toMatch(/text-wrap:\s*pretty/);
  });

  it('styles the heading accent as a restrained secondary-color rule', () => {
    const rule = css.match(/\.k-header-accent\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toMatch(/width:\s*clamp\(/);
    expect(rule).toMatch(/height:\s*0\.18rem/);
    expect(rule).toMatch(/background:\s*var\(--accent-rule\)/);
    expect(rule).toMatch(/border-radius:\s*999px/);
  });

  it('centers constrained title measures in centered headers', () => {
    expect(css).toMatch(
      /\.k-content-header--center h1,\s*\.k-content-header--center h2\s*\{[^}]*margin-inline:\s*auto/,
    );
  });
});
