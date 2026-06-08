import { describe, expect, it } from 'vitest';

import { buildSlidesMd, type Presentation } from '../buildSlidesMd';
import { parseDeck } from '../parse';

// Minimal valid Lexical editor state (root > paragraph > text) for richText
// fields in fixtures, matching what convertLexicalToHTML expects.
function lexical(text: string) {
  return {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
          textFormat: 0,
          children: [
            { type: 'text', text, detail: 0, format: 0, mode: 'normal' as const, style: '', version: 1 },
          ],
        },
      ],
    },
  } as never;
}

const HEADMATTER = `colorSchema: light
aspectRatio: 16/9
fonts:
  sans: Roboto
  provider: google
  local: Gilroy`;

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
      { blockType: 'cta', title: 'Thank you' },
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

  it('merges the first slide frontmatter into the headmatter block (no phantom empty first slide)', () => {
    const result = build([
      { blockType: 'cover', title: 'Hello' },
      { blockType: 'section', title: 'Next' },
    ]);
    const firstFence = result.split('\n---\n')[0]!;
    // Headmatter and the first slide's frontmatter share one fence — a
    // standalone headmatter block would render as an empty first slide.
    expect(firstFence).toContain('title: "Test Deck"');
    expect(firstFence).toContain('layout: cover');
    // No empty chunk between fences anywhere in the deck
    const chunks = result.split(/^---\s*$/m);
    expect(chunks.filter((c, i) => i > 0 && c.trim() === '')).toHaveLength(0);
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
      { blockType: 'cta', title: 'Thank you' },
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
      { blockType: 'statement', title: 'Statement', body: lexical('Body text') },
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
        blockType: 'quotes',
        title: 'Quotes',
        quotes: [{ quote: 'Great', authorName: 'John', authorRole: 'CEO' }],
      },
      {
        blockType: 'cta',
        title: 'Thank you',
        subtitle: 'Questions?',
        primaryAction: 'Go',
        footerNote: 'site.example',
      },
      { blockType: 'markdown', layout: 'center', content: '# Raw' },
    ];

    const md = build(slides);
    const parsed = parseDeck(md);
    expect(parsed.slides.length).toBe(9);
  });
});
