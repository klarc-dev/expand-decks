import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function collectPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectPages(full));
    } else if (entry === 'page.tsx') {
      out.push(full);
    }
  }
  return out;
}

describe('(frontend) pages', () => {
  // The route-group layout renders <html>/<body>. A page rendering its own
  // shell nests html inside body — invalid DOM that React reports as
  // hydration mismatches (seen on /share/[token] during dogfooding).
  it('never render their own <html> or <body> shell', () => {
    const pages = collectPages(FRONTEND_DIR);
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      const src = readFileSync(page, 'utf-8');
      expect(src, `${page} must not render <html>`).not.toMatch(/<html[\s>]/);
      expect(src, `${page} must not render <body>`).not.toMatch(/<body[\s>]/);
    }
  });
});
