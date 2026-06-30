import { describe, expect, it } from 'vitest';

import { buildSlidevExportArgs, parsePositiveInt } from '../slidevExportArgs';

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

  it('uses networkidle plus a settle wait only for Mermaid decks', () => {
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

  it('parses positive integer env values with a safe fallback', () => {
    expect(parsePositiveInt('60000', 120000)).toBe(60000);
    expect(parsePositiveInt('0', 120000)).toBe(120000);
    expect(parsePositiveInt('-1', 120000)).toBe(120000);
    expect(parsePositiveInt('nope', 120000)).toBe(120000);
    expect(parsePositiveInt(undefined, 120000)).toBe(120000);
  });
});
