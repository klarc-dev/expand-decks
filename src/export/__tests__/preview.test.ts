import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '../canvas';
import { renderBlockPreview } from '../preview';
import { buildPreviewRenderContext } from '../renderContext';

describe('renderBlockPreview()', () => {
  it('preserves final Slidev frame classes from slide frontmatter', () => {
    const preview = renderBlockPreview({
      blockType: 'section',
      title: 'Cadre final',
    } as never);

    expect(preview).not.toBeNull();
    expect(preview?.layout).toBe('center');
    expect(preview?.className).toContain('k-dark');
    expect(preview?.className).toContain('relative');
    expect(preview?.hideChrome).toBe(true);
    expect(preview?.html).not.toMatch(/^---/);
  });

  it('applies the cover gradient on the same root frame used by final Slidev output', () => {
    const preview = renderBlockPreview({ blockType: 'cover', title: 'Ouverture' } as never);

    expect(preview).not.toBeNull();
    expect(preview?.className).toBe('relative k-dark k-gradient');
    expect(preview?.html).not.toContain('class="k-dark k-gradient');
  });

  it('uses the statement template dark surface even when legacy data asks for light', () => {
    const preview = renderBlockPreview({
      blockType: 'statement',
      title: 'Message',
      surface: 'light',
    } as never);

    expect(preview).not.toBeNull();
    expect(preview?.className).toBe('relative k-dark');
    expect(preview?.hideChrome).toBe(false);
  });

  it('preserves image layout frontmatter for Slidev image slides', () => {
    const preview = renderBlockPreview({
      blockType: 'section',
      title: 'Avec image',
      image: { url: '/media/photo.jpg' },
      imagePosition: 'left',
    } as never);

    expect(preview).not.toBeNull();
    expect(preview?.layout).toBe('image-left');
    expect(preview?.image).toBe('/media/photo.jpg');
  });

  it('carries Mermaid source so admin preview uses the same CSS contain layout as export', () => {
    const preview = renderBlockPreview({
      blockType: 'mermaid',
      title: 'Diagramme',
      source: '```mermaid\nflowchart TD\n  A --> B\n```',
    } as never);

    expect(preview).not.toBeNull();
    expect(preview?.className).toContain('k-diagram-slide');
    expect(preview?.html).toContain('```mermaid\n');
    expect(preview?.mermaid).toEqual({ source: 'flowchart TD\n  A --> B' });
  });

  it('keeps the statement template dark regardless of the preceding cover', () => {
    const ctx = buildPreviewRenderContext(['cover', 'statement'], 1, []);
    const preview = renderBlockPreview({ blockType: 'statement', title: 'Message' } as never, ctx);

    expect(preview).not.toBeNull();
    expect(preview?.className).toBe('relative k-dark');
  });

  it('uses deck context so statement variant indexes match final export order', () => {
    const first = renderBlockPreview(
      { blockType: 'statement', title: 'One' } as never,
      buildPreviewRenderContext(['statement', 'section', 'statement', 'statement'], 0, []),
    );
    const second = renderBlockPreview(
      { blockType: 'statement', title: 'Two' } as never,
      buildPreviewRenderContext(['statement', 'section', 'statement', 'statement'], 2, []),
    );
    const third = renderBlockPreview(
      { blockType: 'statement', title: 'Three' } as never,
      buildPreviewRenderContext(['statement', 'section', 'statement', 'statement'], 3, []),
    );

    expect(first?.html).toContain('k-hero--hero');
    expect(second?.html).toContain('k-hero--title');
    expect(third?.html).toContain('k-hero--display');
  });

  it('uses deck context section titles for agenda fallback items', () => {
    const ctx = buildPreviewRenderContext(['cover', 'section', 'agenda'], 2, ['Intro', 'Roadmap']);
    const preview = renderBlockPreview(
      { blockType: 'agenda', title: 'Plan', items: [] } as never,
      ctx,
    );

    expect(preview?.html).toContain('Intro');
    expect(preview?.html).toContain('Roadmap');
  });

  it('computes page and total with the same context fold used by export', () => {
    expect(buildPreviewRenderContext(['cover', 'statement', 'cta'], 1, [])).toMatchObject({
      page: 2,
      total: 3,
    });
  });
});

describe('slide canvas contract', () => {
  it('matches Slidev headmatter so preview and final share one coordinate system', () => {
    const headmatter = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'headmatter.yaml'),
      'utf-8',
    );

    expect(headmatter).toContain(`canvasWidth: ${SLIDE_CANVAS_WIDTH}`);
    expect(`${SLIDE_CANVAS_WIDTH}:${SLIDE_CANVAS_HEIGHT}`).toBe('1280:720');
  });
});

describe('Mermaid config contract', () => {
  it('keeps Slidev setup importable with the staged sibling config copy', () => {
    const setup = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'mermaid-setup.ts'),
      'utf-8',
    );
    const runner = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'jobs', 'buildSlidesRunner.ts'),
      'utf-8',
    );

    expect(setup).toContain("from './mermaidConfig'");
    expect(runner).toContain("join(workdir, ARTIFACTS.setupDir, 'mermaidConfig.ts')");
  });
});
