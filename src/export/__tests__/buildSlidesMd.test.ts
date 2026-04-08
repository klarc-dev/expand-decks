import { describe, expect, it } from 'vitest';

import { buildSlidesMd, type Presentation } from '../buildSlidesMd';
import { parseDeck } from '../parse';

const HEADMATTER = `colorSchema: light
aspectRatio: 16/9
fonts:
  sans: Inter
  serif: Fraunces
  provider: google`;

function build(slides: Presentation['slides']): string {
  return buildSlidesMd({ title: 'Test Deck', slides }, { headmatter: HEADMATTER });
}

describe('buildSlidesMd()', () => {
  it('produces valid Slidev markdown with headmatter', () => {
    const result = build([
      { blockType: 'cover', title: 'Hello' },
    ]);
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('title: "Test Deck"');
    expect(result).toContain('colorSchema: light');
    expect(result).toContain('Hello');
  });

  it('is deterministic (same input produces same output)', () => {
    const slides: Presentation['slides'] = [
      { blockType: 'cover', title: 'Deterministic' },
      { blockType: 'section', title: 'Section', number: '01' },
      { blockType: 'end', wordmark: 'Brand' },
    ];
    const a = build(slides);
    const b = build(slides);
    expect(a).toBe(b);
  });

  it('separates slides with ---', () => {
    const result = build([
      { blockType: 'cover', title: 'Slide 1' },
      { blockType: 'section', title: 'Slide 2' },
    ]);
    // Count --- separators (between slides, not including headmatter fences)
    const parts = result.split('\n---\n');
    // headmatter-end | slide1 | slide2
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('throws for unknown block type', () => {
    expect(() =>
      build([{ blockType: 'unknown' as never, title: 'Bad' } as never]),
    ).toThrow('Unknown block type: unknown');
  });

  it('handles empty slides array', () => {
    const result = build([]);
    expect(result).toContain('title: "Test Deck"');
    // Should just be headmatter with no slide separators after
  });

  it('round-trip: parseDeck preserves slide count', () => {
    const slides: Presentation['slides'] = [
      { blockType: 'cover', title: 'Cover' },
      { blockType: 'statement', title: 'Statement', eyebrow: 'Tag' },
      {
        blockType: 'cardGrid',
        title: 'Grid',
        cards: [
          { number: '01', title: 'A', description: 'Desc' },
          { number: '02', title: 'B', description: 'Desc' },
        ],
      },
      { blockType: 'end', wordmark: 'Brand' },
    ];

    const md = build(slides);
    const parsed = parseDeck(md);

    expect(parsed.slides.length).toBe(slides.length);
  });

  it('round-trip: preserves headmatter title', () => {
    const md = build([{ blockType: 'cover', title: 'Test' }]);
    const parsed = parseDeck(md);

    expect(parsed.headmatter.title).toBe('Test Deck');
  });

  it('handles a full deck with all block types', () => {
    const slides: Presentation['slides'] = [
      { blockType: 'cover', title: 'Cover', eyebrow: 'Tag', subtitle: 'Sub' },
      { blockType: 'statement', title: 'Statement', body: 'Body text' },
      { blockType: 'section', title: 'Section', number: '02', surface: 'dark' },
      {
        blockType: 'cardGrid',
        title: 'Grid',
        columns: '4',
        cards: [{ number: '01', title: 'Card', description: 'Desc' }],
      },
      {
        blockType: 'twoCols',
        title: 'Two Cols',
        intro: 'Intro text',
        rightCards: [{ title: 'RC', description: 'RD' }],
      },
      {
        blockType: 'stats',
        title: 'Stats',
        stats: [{ value: '42', label: 'Things' }],
      },
      {
        blockType: 'testimonials',
        title: 'Quotes',
        quotes: [{ quote: 'Great', authorName: 'John', authorRole: 'CEO' }],
      },
      {
        blockType: 'offices',
        title: 'Offices',
        offices: [{ name: 'Lyon', region: 'RA', specialties: 'Bio' }],
      },
      {
        blockType: 'cta',
        title: 'CTA',
        primaryAction: 'Go',
        contactRows: [{ label: 'Web', value: 'site.com' }],
      },
      { blockType: 'markdown', layout: 'center', content: '# Raw' },
      { blockType: 'end', wordmark: 'Brand', tagline: 'Tagline' },
    ];

    const md = build(slides);
    const parsed = parseDeck(md);
    expect(parsed.slides.length).toBe(11);
  });
});
