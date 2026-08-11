import { describe, expect, it } from 'vitest';

import { slideHasImages } from '../buildSlidesRunner';
import { buildSlidevEnv, buildSlidevExportArgs, parsePositiveInt } from '../slidevExportArgs';

describe('buildSlidevExportArgs', () => {
  it('uses native single-pass PDF export flags by default', () => {
    expect(buildSlidevExportArgs({ output: 'slides.pdf', hasMermaid: false })).toEqual([
      'export',
      '--format',
      'pdf',
      '--output',
      'slides.pdf',
      '--timeout',
      '120000',
      '--wait-until',
      'load',
    ]);
  });

  it('uses networkidle plus a settle wait for Mermaid decks', () => {
    expect(buildSlidevExportArgs({ output: 'slides.pdf', hasMermaid: true })).toEqual([
      'export',
      '--format',
      'pdf',
      '--output',
      'slides.pdf',
      '--timeout',
      '120000',
      '--wait-until',
      'networkidle',
      '--wait',
      '4000',
    ]);
  });

  it('uses networkidle plus a settle wait for image decks', () => {
    expect(
      buildSlidevExportArgs({ output: 'slides.pdf', hasMermaid: false, hasImages: true }),
    ).toEqual([
      'export',
      '--format',
      'pdf',
      '--output',
      'slides.pdf',
      '--timeout',
      '120000',
      '--wait-until',
      'networkidle',
      '--wait',
      '4000',
    ]);
  });

  it('builds PNG export args with load wait policy for ordinary decks', () => {
    expect(
      buildSlidevExportArgs({ output: 'png', format: 'png', hasMermaid: false, perSlide: true }),
    ).toEqual([
      'export',
      '--format',
      'png',
      '--output',
      'png',
      '--timeout',
      '120000',
      '--wait-until',
      'load',
      '--per-slide',
    ]);
  });

  it('builds PNG export args with Mermaid settle policy for diagram decks', () => {
    expect(
      buildSlidevExportArgs({ output: 'png', format: 'png', hasMermaid: true, perSlide: true }),
    ).toEqual([
      'export',
      '--format',
      'png',
      '--output',
      'png',
      '--timeout',
      '120000',
      '--wait-until',
      'networkidle',
      '--wait',
      '4000',
      '--per-slide',
    ]);
  });

  it('supports Slidev range exports for future partial-PDF cache work', () => {
    expect(
      buildSlidevExportArgs({ output: 'partial.pdf', hasMermaid: false, range: '2,4-6' }),
    ).toContain('--range');
    expect(
      buildSlidevExportArgs({ output: 'partial.pdf', hasMermaid: false, range: '2,4-6' }),
    ).toContain('2,4-6');
  });

  it('keeps per-slide export as an explicit escape hatch', () => {
    expect(
      buildSlidevExportArgs({ output: 'slides.pdf', hasMermaid: false, perSlide: true }),
    ).toContain('--per-slide');
  });

  it('can enable native PDF TOC generation', () => {
    expect(
      buildSlidevExportArgs({ output: 'slides.pdf', hasMermaid: false, withToc: true }),
    ).toContain('--with-toc');
  });

  it('forces Slidev dev mode and strips AI secrets from production subprocesses', () => {
    expect(
      buildSlidevEnv({
        NODE_ENV: 'production',
        OPENAI_API_KEY: 'secret',
        ANTHROPIC_API_KEY: 'secret',
        PATH: '/usr/bin',
      }),
    ).toEqual({
      NODE_ENV: 'development',
      OPENAI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      PATH: '/usr/bin',
    });
  });

  it('parses positive integer env values with a safe fallback', () => {
    expect(parsePositiveInt('60000', 120000)).toBe(60000);
    expect(parsePositiveInt('0', 120000)).toBe(120000);
    expect(parsePositiveInt('-1', 120000)).toBe(120000);
    expect(parsePositiveInt('nope', 120000)).toBe(120000);
    expect(parsePositiveInt(undefined, 120000)).toBe(120000);
  });
});

describe('slideHasImages', () => {
  it('detects slide image upload relationships', () => {
    expect(slideHasImages({ image: { url: '/media/photo.jpg' } })).toBe(true);
    expect(slideHasImages({ image: 12 })).toBe(false);
  });

  it('detects cover speaker relationship rows that may contain avatars', () => {
    expect(
      slideHasImages({ intervenants: [{ user: { avatar: { url: '/media/avatar.jpg' } } }] }),
    ).toBe(true);
    expect(slideHasImages({})).toBe(false);
  });
});
