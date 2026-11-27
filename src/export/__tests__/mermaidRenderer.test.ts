import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const initialize = vi.fn();
vi.mock('mermaid/dist/mermaid.esm.mjs', () => ({
  default: { initialize, render: async () => ({ svg: '<svg width="10" height="10"></svg>' }) },
}));
vi.mock('../mermaidConfig', () => ({
  buildMermaidConfig: () => ({ theme: 'base', themeVariables: { primaryColor: '#FAFBFB' } }),
}));

// Slidev serves /print through Vite, not the SPA's Rollup bundle. The package
// root pulls unoptimized CommonJS dayjs into that browser module graph.
describe('Slidev Mermaid renderer module', () => {
  it('uses the same browser ESM entry as Slidev rather than the package root', () => {
    const source = readFileSync(new URL('../mermaid-renderer.ts', import.meta.url), 'utf8');
    expect(source).toContain("from 'mermaid/dist/mermaid.esm.mjs'");
    expect(source).not.toMatch(/from ['"]mermaid['"]/);
  });

  it('keeps the organisation theme when Slidev passes its own theme option', async () => {
    const setup = (await import('../mermaid-renderer')).default;
    const render = await setup();
    // Slidev's <Mermaid> always forwards `theme` (undefined in light mode, 'dark' in dark mode).
    await render('flowchart LR\n A --> B', { theme: undefined, scale: 1 });
    await render('flowchart LR\n A --> B', { theme: 'dark' });
    for (const [config] of initialize.mock.calls) {
      expect(config.theme).toBe('base');
      expect(config.themeVariables.primaryColor).toBe('#FAFBFB');
    }
    expect(initialize.mock.calls[0]![0].scale).toBe(1);
  });
});
