import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Slidev serves /print through Vite, not the SPA's Rollup bundle. The package
// root pulls unoptimized CommonJS dayjs into that browser module graph.
describe('Slidev Mermaid renderer module', () => {
  it('uses the same browser ESM entry as Slidev rather than the package root', () => {
    const source = readFileSync(new URL('../mermaid-renderer.ts', import.meta.url), 'utf8');
    expect(source).toContain("from 'mermaid/dist/mermaid.esm.mjs'");
    expect(source).not.toMatch(/from ['"]mermaid['"]/);
  });
});
