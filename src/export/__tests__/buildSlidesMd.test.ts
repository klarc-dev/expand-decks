import { describe, expect, it } from 'vitest';

import { buildSlidesMd, type Presentation } from '../buildSlidesMd';
import { parseDeck } from '../parse';
import { SLIDE_LIMITS } from '../../blocks/spec/limits';

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
  it('rejects card variables that expand beyond the canonical rich-text limit', () => {
    const slides: Presentation['slides'] = [
      {
        blockType: 'cardGrid',
        title: 'Cards',
        columns: '2',
        cards: [{ title: 'First', description: lexical('{details}') }, { title: 'Second' }],
      },
    ];
    expect(() =>
      buildSlidesMd(
        { title: 'Variables', slides },
        {
          vars: {
            details: 'x'.repeat(SLIDE_LIMITS.cardGrid.cardDescription.max + 1),
          },
        },
      ),
    ).toThrow();
    expect(
      buildSlidesMd({ title: 'Variables', slides }, { vars: { details: 'Complete copy' } }),
    ).toContain('Complete copy');
  });
  it('rewrites the exported html language when the presentation language is supplied', () => {
    const result = buildSlidesMd(
      {
        title: 'English deck',
        slides: [{ blockType: 'cover', title: 'Cover' }] as never,
      },
      { headmatter: `${HEADMATTER}\nhtmlAttrs:\n  lang: fr`, language: 'en' },
    );

    expect(result).toContain('  lang: en');
    expect(result).not.toContain('  lang: fr');
  });

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

  it('renders authored footnotes with inline superscript calls and a numbered footer list', () => {
    const result = build([
      {
        blockType: 'statement',
        title: 'Claim[^1]',
        footer: lexical('Une seconde affirmation[^2] et une référence inconnue[^9].'),
        footnotes: [{ text: 'Source : Gartner, 2025' }, { text: 'Voir [étude](https://x.test)' }],
      } as never,
    ]);
    expect(result).toContain('k-def-footer');
    expect(result).toContain('Claim<sup class="k-def-ref">1</sup>');
    expect(result).toContain('affirmation<sup class="k-def-ref">2</sup>');
    expect(result).toContain('inconnue[^9]');
    expect(result).toContain(
      '<span class="k-def-index">1</span><span class="k-def-text">Source : Gartner, 2025</span>',
    );
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

  it('resolves {path} variables against the build vars context', () => {
    const result = buildSlidesMd(
      {
        title: 'Deck',
        slides: [{ blockType: 'cover', title: 'Bienvenue chez {org.name}' }],
      },
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

  it('rejects unknown block types at the canonical render boundary', () => {
    expect(() => build([{ blockType: 'unknown' as never, title: 'Bad' } as never])).toThrow();
  });

  it('rejects an unknown document template without falling back to presentation', () => {
    expect(() =>
      buildSlidesMd(
        {
          title: 'Bad template',
          documentTemplate: 'unknown' as never,
          slides: [{ blockType: 'cover', title: 'Cover' }],
        },
        { headmatter: HEADMATTER },
      ),
    ).toThrow('Template de document inconnu');
  });

  it('rejects an invalid standardized report at the canonical render boundary', () => {
    expect(() =>
      buildSlidesMd(
        {
          title: 'Invalid report',
          documentTemplate: 'standard-report',
          slides: [
            { blockType: 'cover', title: 'Cover' },
            { blockType: 'agenda', title: 'Agenda', items: [] },
            { blockType: 'statement', title: 'One' },
            { blockType: 'statement', title: 'Two' },
            { blockType: 'table', title: 'Table', columns: [], rows: [] },
            { blockType: 'cta', title: 'Close' },
          ],
        } as never,
        { headmatter: HEADMATTER },
      ),
    ).toThrow('layout « stats »');
  });

  it('rejects over-limit content before a renderer can clip or omit it', () => {
    const cards = Array.from({ length: SLIDE_LIMITS.cardGrid.cards.max + 1 }, (_, index) => ({
      number: String(index + 1),
      title: `Card ${index + 1}`,
    }));
    expect(() => build([{ blockType: 'cardGrid', title: 'Too dense', cards }])).toThrow();
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

  it('resolves agenda slide links to page numbers from the raw block ids', () => {
    const md = build([
      { blockType: 'cover', title: 'Cover' },
      {
        blockType: 'agenda',
        title: 'Plan',
        items: [
          { label: 'Produit', description: null, slideId: 'blk-produit' },
          { label: 'Suite', description: null, slideId: 'blk-suite' },
        ],
      },
      { id: 'blk-produit', blockType: 'statement', title: 'Produit' },
      { id: 'blk-suite', blockType: 'statement', title: 'Suite' },
    ] as never);
    expect(md).toContain('<Link :to="3" class="k-ag-link">Produit</Link>');
    expect(md).toContain('<Link :to="4" class="k-ag-link">Suite</Link>');
  });

  it('plants a page anchor at the top of every slide body for internal PDF links', () => {
    const md = build([
      { blockType: 'cover', title: 'Cover' },
      { blockType: 'statement', title: 'Statement' },
    ]);
    expect(md).toContain('<div id="1" class="k-page-anchor"></div>');
    expect(md).toContain('<div id="2" class="k-page-anchor"></div>');
    // The anchor sits right after the frontmatter fence, before the slide body.
    expect(md).toMatch(/\n---\n\n<div id="2" class="k-page-anchor"><\/div>\n\n<div/);
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
      {
        type: 'twoCols',
        block: { title: 'Two Cols', intro: lexical('Intro') },
      },
      {
        type: 'cardGrid',
        block: {
          title: 'Grid',
          cards: [
            { number: '01', title: 'A', description: lexical('D') },
            { number: '02', title: 'B', description: lexical('D') },
          ],
        },
      },
      {
        type: 'stats',
        block: {
          title: 'Stats',
          stats: [
            { value: '1', label: 'L' },
            { value: '2', label: 'M' },
          ],
        },
      },
      {
        type: 'quotes',
        block: {
          title: 'Quotes',
          quotes: [{ quote: lexical('Q'), authorName: 'A' }],
        },
      },
      { type: 'cta', block: { title: 'CTA' } },
      {
        type: 'table',
        block: {
          title: 'Table',
          columns: [{ header: 'H' }, { header: 'I' }],
          rows: [{ cells: [{ value: lexical('c') }, { value: lexical('d') }] }],
        },
      },
      {
        type: 'timeline',
        block: {
          title: 'Timeline',
          steps: [
            { label: 'S', description: null },
            { label: 'T', description: null },
          ],
        },
      },
      {
        type: 'mermaid',
        block: { title: 'Diagram', source: 'flowchart TD\nA-->B' },
      },
      {
        type: 'agenda',
        block: {
          title: 'Agenda',
          items: [
            { label: 'One', description: null },
            { label: 'Two', description: null },
          ],
        },
      },
    ];

    for (const { type, block } of FIXTURES) {
      it(`${type} renders a numbered source band from authored footnotes`, () => {
        const result = build([
          {
            blockType: type,
            ...block,
            footnotes: [{ text: 'Source : CGI art. 256' }],
          } as never,
        ]);
        expect(result).toContain('k-def-footer');
        expect(result).toContain(
          '<span class="k-def-index">1</span><span class="k-def-text">Source : CGI art. 256</span>',
        );
        // The slot marker must always be resolved, never leaked into output.
        expect(result).not.toContain('k-def-footer-slot');
      });
    }
  });

  it('handles a full deck with all block types', () => {
    const slides: Presentation['slides'] = [
      {
        blockType: 'cover',
        title: 'Cover',
        eyebrow: 'Tag',
        subtitle: lexical('Sub'),
      },
      {
        blockType: 'statement',
        title: 'Statement',
        body: lexical('Body text'),
      },
      { blockType: 'section', title: 'Section', number: '02' },
      {
        blockType: 'cardGrid',
        title: 'Grid',
        columns: '4',
        cards: [
          { number: '01', title: 'Card', description: lexical('Desc') },
          { number: '02', title: 'Card 2', description: lexical('Desc') },
        ],
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
        stats: [
          { value: '42', label: 'Things' },
          { value: '7', label: 'Others' },
        ],
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
        columns: [{ header: 'H' }, { header: 'I' }],
        rows: [{ cells: [{ value: lexical('Cell') }, { value: lexical('Cell 2') }] }],
      },
      {
        blockType: 'timeline',
        title: 'Timeline',
        steps: [
          { label: 'S', description: 'D' },
          { label: 'T', description: 'E' },
        ],
      },
      {
        blockType: 'mermaid',
        title: 'Diagram',
        source: 'flowchart TD\nA-->B',
      },
      {
        blockType: 'agenda',
        title: 'Agenda',
        items: [
          { label: 'One', description: null },
          { label: 'Two', description: null },
        ],
      },
    ];

    const md = build(slides);
    const parsed = parseDeck(md);
    expect(parsed.slides.length).toBe(12);
  });
});
