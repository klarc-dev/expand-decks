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
            {
              type: 'text',
              text,
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
              version: 1,
            },
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
    const result = build([{ blockType: 'cover', title: 'Hello' }]);
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

  it('renders authored footnotes as a numbered def-footer band', () => {
    const result = build([
      {
        blockType: 'statement',
        title: 'Claim',
        footnotes: [{ text: 'Source : Gartner, 2025' }, { text: 'Voir [étude](https://x.test)' }],
      } as never,
    ]);
    expect(result).toContain('k-def-footer');
    // First note numbered ¹, second ², in author order.
    expect(result).toContain(
      '<span class="k-def-index">1</span><span class="k-def-text">Source : Gartner, 2025</span>',
    );
    // md() turns the inline link into an anchor.
    expect(result).toContain(
      '<span class="k-def-index">2</span><span class="k-def-text">Voir <a href="https://x.test">étude</a></span>',
    );
  });

  it('skips blank footnote texts and emits no band when all empty', () => {
    const result = build([
      {
        blockType: 'statement',
        title: 'Claim',
        footnotes: [{ text: '  ' }, { text: '' }],
      } as never,
    ]);
    expect(result).not.toContain('k-def-footer');
  });

  it('does not flush a footnote band for markdown blocks', () => {
    // markdown carries no footnotes field and never calls wrapSlide; seedFootnotes
    // is skipped for it, so even a stray value must not produce a band.
    const result = build([
      { blockType: 'markdown', content: '# Hi', footnotes: [{ text: 'x' }] } as never,
    ]);
    expect(result).not.toContain('k-def-footer');
  });

  it('resolves {path} variables against the build vars context', () => {
    const result = buildSlidesMd(
      { title: 'Deck', slides: [{ blockType: 'cover', title: 'Bienvenue chez {org.name}' }] },
      { headmatter: HEADMATTER, vars: { org: { name: 'Klarc' } } },
    );
    expect(result).toContain('Bienvenue chez Klarc');
    expect(result).not.toContain('{org.name}');
  });

  it('does not leak the vars context to a subsequent build with no vars', () => {
    buildSlidesMd(
      { title: 'Deck', slides: [{ blockType: 'cover', title: '{title}' }] },
      { headmatter: HEADMATTER, vars: { title: 'Resolved' } },
    );
    const second = build([{ blockType: 'cover', title: '{title}' }]);
    // no vars passed → the literal token must survive untouched
    expect(second).toContain('{title}');
    expect(second).not.toContain('Resolved');
  });

  it('throws for unknown block type', () => {
    expect(() => build([{ blockType: 'unknown' as never, title: 'Bad' } as never])).toThrow(
      'Unknown block type: unknown',
    );
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
          { number: '01', title: 'A', description: lexical('Desc') },
          { number: '02', title: 'B', description: lexical('Desc') },
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

  it('bakes 1-indexed kPage and a constant kTotal into every slide frontmatter', () => {
    // These let the footer counter resolve from frontmatter instead of live nav,
    // which is what makes the single-pass (no --per-slide) PDF export number
    // correctly. One block === one slide === one page, deterministically.
    const slides: Presentation['slides'] = [
      { blockType: 'cover', title: 'Cover' },
      { blockType: 'statement', title: 'Statement' },
      { blockType: 'cta', title: 'Thanks' },
    ];

    const parsed = parseDeck(build(slides));

    // Slide 1's frontmatter is merged into the headmatter block, so its kPage/
    // kTotal live there (and parsed.slides[0] is the cover's body with no fm).
    expect(parsed.headmatter.kPage).toBe(1);
    expect(parsed.headmatter.kTotal).toBe(3);
    // Remaining slides carry their own 1-indexed page and the same total.
    expect(parsed.slides[1]?.frontmatter.kPage).toBe(2);
    expect(parsed.slides[1]?.frontmatter.kTotal).toBe(3);
    expect(parsed.slides[2]?.frontmatter.kPage).toBe(3);
    expect(parsed.slides[2]?.frontmatter.kTotal).toBe(3);
  });

  describe('authored sources surface on every source-bearing template', () => {
    const FIXTURES: Array<{ type: string; block: Record<string, unknown> }> = [
      { type: 'section', block: { title: 'Section' } },
      { type: 'statement', block: { title: 'Statement' } },
      { type: 'twoCols', block: { title: 'Two Cols', intro: lexical('Intro') } },
      {
        type: 'cardGrid',
        block: { title: 'Grid', cards: [{ number: '01', title: 'A', description: lexical('D') }] },
      },
      { type: 'stats', block: { title: 'Stats', stats: [{ value: '1', label: 'L' }] } },
      {
        type: 'quotes',
        block: { title: 'Quotes', quotes: [{ quote: lexical('Q'), authorName: 'A' }] },
      },
      { type: 'cta', block: { title: 'CTA' } },
      {
        type: 'table',
        block: {
          title: 'Table',
          columns: [{ header: 'H' }],
          rows: [{ cells: [{ value: lexical('c') }] }],
        },
      },
      {
        type: 'timeline',
        block: { title: 'Timeline', steps: [{ label: 'S', description: null }] },
      },
      { type: 'mermaid', block: { title: 'Diagram', source: 'flowchart TD\nA-->B' } },
      { type: 'agenda', block: { title: 'Agenda', items: [{ label: 'One', description: null }] } },
    ];

    for (const { type, block } of FIXTURES) {
      it(`${type} renders a numbered source band from authored footnotes`, () => {
        const result = build([
          { blockType: type, ...block, footnotes: [{ text: 'Source : CGI art. 256' }] } as never,
        ]);
        expect(result).toContain('k-def-footer');
        expect(result).toContain(
          '<span class="k-def-index">1</span><span class="k-def-text">Source : CGI art. 256</span>',
        );
        // The slot marker must always be resolved, never leaked into output.
        expect(result).not.toContain('k-def-footer-slot');
      });
    }

    it('markdown is intentionally excluded from the sources repeater', () => {
      const result = build([
        { blockType: 'markdown', content: '# Hi', footnotes: [{ text: 'x' }] } as never,
      ]);
      expect(result).not.toContain('k-def-footer');
    });
  });

  it('handles a full deck with all block types', () => {
    const slides: Presentation['slides'] = [
      { blockType: 'cover', title: 'Cover', eyebrow: 'Tag', subtitle: lexical('Sub') },
      { blockType: 'statement', title: 'Statement', body: lexical('Body text') },
      { blockType: 'section', title: 'Section', number: '02' },
      {
        blockType: 'cardGrid',
        title: 'Grid',
        columns: '4',
        cards: [{ number: '01', title: 'Card', description: lexical('Desc') }],
      },
      {
        blockType: 'twoCols',
        title: 'Two Cols',
        intro: lexical('Intro text'),
        rightCards: [{ title: 'RC', description: lexical('RD') }],
      },
      {
        blockType: 'stats',
        title: 'Stats',
        stats: [{ value: '42', label: 'Things' }],
      },
      {
        blockType: 'quotes',
        title: 'Quotes',
        quotes: [{ quote: lexical('Great'), authorName: 'John', authorRole: 'CEO' }],
      },
      {
        blockType: 'cta',
        title: 'Thank you',
        subtitle: lexical('Questions?'),
        primaryAction: 'Go',
        footerNote: lexical('site.example'),
      },
      {
        blockType: 'table',
        title: 'Table',
        columns: [{ header: 'H' }],
        rows: [{ cells: [{ value: lexical('Cell') }] }],
      },
      {
        blockType: 'timeline',
        title: 'Timeline',
        steps: [{ label: 'S', description: 'D' }],
      },
      {
        blockType: 'mermaid',
        title: 'Diagram',
        source: 'flowchart TD\nA-->B',
      },
      {
        blockType: 'agenda',
        title: 'Agenda',
        items: [{ label: 'One', description: null }],
      },
      { blockType: 'markdown', layout: 'center', content: '# Raw' },
    ];

    const md = build(slides);
    const parsed = parseDeck(md);
    expect(parsed.slides.length).toBe(13);
  });
});
