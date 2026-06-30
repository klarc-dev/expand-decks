import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SLIDE_CANVAS_HEIGHT, SLIDE_CANVAS_WIDTH } from '../canvas';
import { renderBlockPreview } from '../preview';

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

  it('preserves light-surface classes instead of inventing preview styling', () => {
    const preview = renderBlockPreview({
      blockType: 'statement',
      title: 'Message',
      surface: 'light',
    } as never);

    expect(preview).not.toBeNull();
    expect(preview?.className).toBe('relative');
    expect(preview?.hideChrome).toBe(false);
    expect(preview?.className).not.toContain('k-dark');
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
