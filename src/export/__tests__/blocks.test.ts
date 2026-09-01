import { describe, expect, it } from 'vitest';

import { renderAgenda } from '../blocks/agenda';
import { renderCardGrid } from '../blocks/cardGrid';
import { renderCover } from '../blocks/cover';
import { renderCta } from '../blocks/cta';
import { renderMarkdown } from '../blocks/markdown';
import { renderMermaid } from '../blocks/mermaid';
import { renderQuotes } from '../blocks/quotes';
import { renderSection } from '../blocks/section';
import { renderStatement } from '../blocks/statement';
import { renderStats } from '../blocks/stats';
import { renderTable } from '../blocks/table';
import { renderTimeline } from '../blocks/timeline';
import { renderTwoCols } from '../blocks/twoCols';
import { escape, md, resetDefs } from '../utils';

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

describe('escape()', () => {
  it('encodes HTML special characters', () => {
    expect(escape('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('encodes ampersands', () => {
    expect(escape('A & B')).toBe('A &amp; B');
  });

  it('encodes single quotes', () => {
    expect(escape("it's")).toBe('it&#39;s');
  });

  it('handles triple dashes (Slidev separator)', () => {
    // Dashes are not HTML-special, so they pass through
    expect(escape('---')).toBe('---');
  });

  it('handles empty string', () => {
    expect(escape('')).toBe('');
  });
});

describe('md()', () => {
  it('converts bold to <strong>', () => {
    expect(md('hello **world**')).toBe('hello <strong>world</strong>');
  });

  it('converts italic to <em>', () => {
    expect(md('hello *world*')).toBe('hello <em>world</em>');
  });

  it('converts links to <a>', () => {
    expect(md('[Klarc](https://klarc.com)')).toBe('<a href="https://klarc.com">Klarc</a>');
  });

  it('escapes HTML while converting markdown', () => {
    expect(md('**<script>**')).toBe('<strong>&lt;script&gt;</strong>');
  });
});

describe('renderCover()', () => {
  it('produces valid markdown with layout: cover', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Hello World',
    });
    expect(result).toContain('layout: cover');
    expect(result).toContain('Hello World');
  });

  it('includes eyebrow when provided', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Title',
      eyebrow: 'Tag Line',
    });
    expect(result).toContain('k-eyebrow');
    expect(result).toContain('Tag Line');
  });

  it('always applies the cover gradient surface', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Test',
    });
    expect(result).toContain('class: relative k-dark k-gradient');
  });

  it('ignores legacy authored surface values', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Test',
      surface: 'light',
    } as never);
    expect(result).toContain('class: relative k-dark k-gradient');
  });

  it('reserves a footer slot inside the full-height cover frame', () => {
    resetDefs();
    const result = renderCover({
      blockType: 'cover',
      title: 'Cover {{def:Source}}',
    });
    expect(result).toContain('k-def-footer');
    expect(result).not.toContain('k-def-footer-slot');
    expect(result).toMatch(/k-cover[\s\S]*k-def-footer/);
  });

  it('escapes XSS in title', () => {
    const result = renderCover({
      blockType: 'cover',
      title: '<img onerror=alert(1)>',
    });
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('produces clean output with empty optional fields', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Minimal',
      eyebrow: null,
      subtitle: null,
    });
    expect(result).toContain('Minimal');
    expect(result).not.toContain('k-eyebrow');
    expect(result).not.toContain('k-hero-sub');
    expect(result).not.toContain('k-btn');
  });

  it('emits image-right frontmatter when image is set', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With photo',
      image: { url: '/media/photo.jpg' },
    });
    expect(result).toContain('layout: image-right');
    expect(result).toContain('image: /media/photo.jpg');
    expect(result).not.toContain('k-cover--full-bleed');
    expect(result).not.toContain('p-14');
  });

  it('emits image-left when imagePosition is left', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With photo',
      image: { url: '/media/photo.jpg' },
      imagePosition: 'left',
    });
    expect(result).toContain('layout: image-left');
  });

  it('keeps layout: cover with a semantic full-bleed frame when no image', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'No image',
    });
    expect(result).toContain('layout: cover');
    expect(result).toContain('k-cover--full-bleed');
    expect(result).not.toContain('image:');
  });

  it('uses staged media files for speaker avatars instead of protected API URLs', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With speakers',
      intervenants: [
        {
          user: {
            name: 'Joachim Brindeau',
            avatar: {
              filename: 'joachim.png',
              url: 'https://slides.example/api/media/file/joachim.png',
            },
          },
        },
      ],
    } as never);

    expect(result).toContain(`:src='"./media/joachim.png"'`);
    expect(result).not.toContain('/api/media/file/joachim.png');
  });
});

describe('shared adaptive card stacks', () => {
  it('applies one density class and equal-row contract to multi-row card grids', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Long comparison grid',
      columns: '2',
      cards: [
        { title: 'One', description: lexical('A'.repeat(180)) },
        { title: 'Two', description: lexical('B'.repeat(40)) },
        { title: 'Three', description: lexical('C'.repeat(40)) },
        { title: 'Four', description: lexical('D'.repeat(40)) },
      ],
    });

    expect(result).toContain('k-card-stack--multirow');
    expect(result).toContain('k-density-compact');
    expect(result).toContain('k-card-scale-sm');
  });

  it('uses the shared stack API for dense quote grids without markup surgery', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Long quotes',
      quotes: [
        { quote: lexical('A'.repeat(180)), authorName: 'A' },
        { quote: lexical('B'.repeat(180)), authorName: 'B' },
        { quote: lexical('C'.repeat(180)), authorName: 'C' },
        { quote: lexical('D'.repeat(180)), authorName: 'D' },
      ],
    });

    expect(result).toContain('k-card-stack--multirow');
    expect(result).toContain('k-tight');
    expect(result).toContain('k-density-dense');
  });
});

describe('renderSection()', () => {
  it('produces layout: center', () => {
    const result = renderSection({
      blockType: 'section',
      title: 'Section Title',
    });
    expect(result).toContain('layout: center');
  });

  it('reserves a footer slot inside the full-height section frame', () => {
    resetDefs();
    const result = renderSection({
      blockType: 'section',
      title: 'Section {{def:Source}}',
    });
    expect(result).toContain('k-def-footer');
    expect(result).not.toContain('k-def-footer-slot');
    expect(result).toMatch(/k-center-hero[\s\S]*k-def-footer/);
  });

  it('includes section number when provided', () => {
    const result = renderSection({
      blockType: 'section',
      title: 'Title',
      number: '02',
    });
    expect(result).toContain('k-section-num');
    expect(result).toContain('02');
  });

  it('emits image-right and drops centering when image is set', () => {
    const result = renderSection({
      blockType: 'section',
      title: 'Section with photo',
      image: { url: '/media/photo.jpg' },
    });
    expect(result).toContain('layout: image-right');
    expect(result).toContain('image: /media/photo.jpg');
    expect(result).toContain('k-center-hero--left');
  });
});

describe('renderStatement() — variant dispatch (U8)', () => {
  it('defaults to centered-hero (layout: center) when variant + index unset', () => {
    const result = renderStatement({ blockType: 'statement', title: 'Statement' });
    expect(result).toContain('layout: center');
    expect(result).toContain('k-hero--center');
    expect(result).toContain('Statement');
  });

  it('each explicit variant renders its distinct heroFrame layout', () => {
    const big = renderStatement({ blockType: 'statement', title: 'T', variant: 'big-statement' });
    expect(big).toContain('k-hero--display');
    expect(big).toContain('k-hero--left');

    const pull = renderStatement({ blockType: 'statement', title: 'T', variant: 'pull-quote' });
    expect(pull).toContain('k-divider'); // accent rule

    // split is a two-column title|body layout — it needs a body to split.
    const split = renderStatement({
      blockType: 'statement',
      title: 'T',
      body: lexical('Right-column body'),
      variant: 'split',
    });
    expect(split).toContain('k-split');
  });

  it('an UNSET variant rotates through all four layouts by ctx.variantIndex, wrapping — KTD6b', () => {
    const at = (i: number) =>
      renderStatement({ blockType: 'statement', title: 'T' }, { variantIndex: i });
    expect(at(0)).toContain('k-hero--center'); // centered-hero
    expect(at(1)).toContain('k-divider'); // pull-quote (accent rule)
    expect(at(2)).toContain('k-hero--display'); // big-statement
    expect(at(3)).toContain('k-hero--left'); // split (no body → left fallback)
    expect(at(4)).toContain('k-hero--center'); // wraps back to centered-hero
  });

  it('an out-of-enum variant from a legacy row falls back to the index, not a crash', () => {
    const r = renderStatement(
      { blockType: 'statement', title: 'T', variant: 'legacy-bogus' as never },
      { variantIndex: 0 },
    );
    expect(r).toContain('k-hero--center');
  });

  it('renders footer as an in-flow caption, not an absolute .k-foot bar (U2)', () => {
    const result = renderStatement({
      blockType: 'statement',
      title: 'Statement',
      footer: lexical('Source note'),
    });
    expect(result).toContain('Source note');
    expect(result).toContain('k-caption');
    expect(result).not.toContain('k-foot');
  });

  it('reserves a footer slot inside the full-height statement hero frame', () => {
    resetDefs();
    const result = renderStatement({ blockType: 'statement', title: 'Statement {{def:Source}}' });
    expect(result).toContain('k-def-footer');
    expect(result).not.toContain('k-def-footer-slot');
    expect(result).toMatch(/k-hero[\s\S]*k-def-footer/);
  });
});

describe('renderTwoCols()', () => {
  it('produces layout: default with k-split inside the shared content frame', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Two Cols',
    });
    expect(result).toContain('layout: default');
    expect(result).toContain('k-split');
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main k-content-main--start');
  });

  it('places the intro separator in the heading-adjacent body row', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Title',
      intro: lexical('Lead copy'),
      rightCards: [{ title: 'Card 1', description: lexical('Desc 1') }],
    });
    expect(result).toContain('k-content-main k-content-main--start');
    expect(result).toMatch(
      /k-content-header[\s\S]*k-content-main k-content-main--start[\s\S]*<hr class="k-divider"\/>/,
    );
  });

  it('renders right cards in the second split column even when left body is empty', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Title',
      rightCards: [
        { title: 'Card 1', description: lexical('Desc 1') },
        { title: 'Card 2', description: null },
      ],
    });
    expect(result).toContain('Card 1');
    expect(result).toContain('Desc 1');
    expect(result).toContain('Card 2');
    expect(result).toMatch(
      /<div class="k-split k-split--body">\n<div><\/div>\n<div class="k-split-cards">/,
    );
  });

  it('emits image-right and keeps rightCards in the content column when image is set', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'TwoCols with photo',
      intro: lexical('Some intro'),
      image: { url: '/media/photo.jpg' },
      rightCards: [{ title: 'Should remain', description: lexical('And so should this') }],
    });
    expect(result).toContain('layout: image-right');
    expect(result).toContain('image: /media/photo.jpg');
    expect(result).not.toContain('k-split');
    expect(result).toContain('Should remain');
    expect(result).toContain('And so should this');
    expect(result).toContain('Some intro');
  });

  it('uses one dense card scale for a pressured right-hand stack', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Long decision framework title that consumes additional vertical space',
      intro: lexical('A long introduction '.repeat(12)),
      leftFooter: lexical('A detailed note '.repeat(10)),
      rightCards: Array.from({ length: 4 }, (_, index) => ({
        title: `A deliberately long card heading ${index + 1}`,
        description: lexical('Detailed card copy '.repeat(16)),
      })),
    });
    expect(result).toContain('k-density-dense');
    expect(result).toContain('k-card-scale-xs');
  });
});

describe('renderCardGrid()', () => {
  const oneCard = [{ title: 'A', description: lexical('Desc') }];

  it('treats the requested column count as a maximum for sparse grids', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).toContain('k-grid-1');
  });

  it('separates header and body in the shared content frame', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main');
    expect(result.indexOf('k-content-header')).toBeLessThan(result.indexOf('k-content-main'));
  });

  it('respects columns setting as an upper bound', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      columns: '3',
      cards: oneCard,
    });
    expect(result).toContain('k-grid-1');
  });

  it('emits no grid container when there are no cards', () => {
    const result = renderCardGrid({ blockType: 'cardGrid', title: 'Empty' });
    expect(result).not.toContain('k-grid');
  });

  it('renders all cards with their numbers and titles', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: [
        { number: '01', title: 'A', description: lexical('Desc A') },
        { number: '02', title: 'B', description: lexical('Desc B') },
        { number: '03', title: 'C', description: lexical('Desc C') },
        { number: '04', title: 'D', description: lexical('Desc D') },
        { number: '05', title: 'E', description: lexical('Desc E') },
        { number: '06', title: 'F', description: lexical('Desc F') },
      ],
    });
    expect(result).toContain('k-grid-3');
    for (const n of ['01', '02', '03', '04', '05', '06']) {
      expect(result).toContain(`>${n}<`);
    }
    for (const t of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(result).toContain(`>${t}<`);
    }
  });

  it('applies one shared compact scale from the densest card', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      columns: '3',
      cards: [
        { title: 'Court', description: lexical('Bref.') },
        {
          title: 'Une carte nettement plus dense',
          description: lexical(
            'Cette description volontairement longue force une réduction commune afin que toutes les cartes conservent exactement la même taille de texte.',
          ),
        },
        { title: 'Court aussi', description: lexical('Bref.') },
      ],
    });

    expect(result).toMatch(/k-card-scale-(sm|xs)/);
    expect(result.match(/k-card-scale-(?:sm|xs)/g)).toHaveLength(1);
  });

  it('renders sidebarText as an in-flow lead band above the cards, not a floating header sidebar', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      sidebarText: lexical('Contexte de la partie'),
      cards: oneCard,
    });
    // The lead is a structural band in the body, not a right-aligned header aside.
    expect(result).toContain('k-cardgrid-lead');
    expect(result).toContain('Contexte de la partie');
    expect(result).not.toContain('k-content-header--split');
    expect(result).not.toContain('k-side-note');
    // Lead reads before the card grid so the slide has a clear top-down hierarchy.
    expect(result.indexOf('k-cardgrid-lead')).toBeLessThan(result.indexOf('k-card-stack'));
  });

  it('stretches the card body to own the content row so cards align to one baseline', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).toContain('k-cardgrid-body');
    expect(result).toContain('k-content-main--stretch');
  });

  it('omits the lead band when no sidebarText is provided', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).not.toContain('k-cardgrid-lead');
  });
});

describe('renderStats()', () => {
  it('uses the fixed light information surface', () => {
    const result = renderStats({
      blockType: 'stats',
      title: 'Stats',
    });
    expect(result).not.toContain('k-dark');
  });

  it('renders each stat value and label', () => {
    const result = renderStats({
      blockType: 'stats',
      title: 'Stats',
      stats: [
        { value: '4', label: 'Expertises' },
        { value: '360', label: 'Couverture' },
      ],
    });
    expect(result).toContain('>4<');
    expect(result).toContain('Expertises');
    expect(result).toContain('>360<');
    expect(result).toContain('Couverture');
  });

  it('offers a line-break opportunity before range punctuation', () => {
    const result = renderStats({
      blockType: 'stats',
      title: 'Stats',
      stats: [{ value: '€12.45M–€18.9M', label: 'Range' }],
    });
    expect(result).toContain('€12.45M–<wbr>€18.9M');
  });

  it('uses the shared content header/body frame', () => {
    const result = renderStats({ blockType: 'stats', title: 'Stats' });
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main');
  });

  it('omits the empty stat grid', () => {
    const result = renderStats({ blockType: 'stats', title: 'Stats' });
    expect(result).not.toContain('k-stat-grid');
  });

  it('selects one dense scale for long values and labels', () => {
    const result = renderStats({
      blockType: 'stats',
      title: 'Detailed impact targets',
      stats: [
        { value: '€12,450,000–€18,900,000', label: 'Projected annual recurring revenue range' },
        { value: '2026–2031', label: 'Multi-year delivery and adoption horizon' },
        { value: '99.987%', label: 'Target platform availability across all regions' },
        { value: '1:250,000', label: 'Maximum supported operating ratio at scale' },
      ],
    });
    expect(result).toContain('k-stat-grid k-grid-4 k-density-dense');
    expect(result).toContain('k-content k-density-dense');
  });

  it('uses production-safe clamped grid classes', () => {
    expect(
      renderStats({
        blockType: 'stats',
        title: 'Stats',
        stats: [
          { value: '1', label: 'A' },
          { value: '2', label: 'B' },
        ],
      }),
    ).toContain('k-grid-2');
    expect(
      renderStats({
        blockType: 'stats',
        title: 'Stats',
        stats: [
          { value: '1', label: 'A' },
          { value: '2', label: 'B' },
          { value: '3', label: 'C' },
          { value: '4', label: 'D' },
          { value: '5', label: 'E' },
        ],
      } as never),
    ).toContain('k-grid-4');
  });
});

describe('renderQuotes()', () => {
  it('renders quotes with author info', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [{ quote: lexical('Great service'), authorName: 'John', authorRole: 'CEO' }],
    });
    expect(result).toContain('Great service');
    expect(result).toContain('John');
    expect(result).toContain('CEO');
  });

  it('centers a single quote instead of stranding it in a two-column grid', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [{ quote: lexical('Single'), authorName: 'A' }],
    });
    expect(result).toContain('k-grid-1');
    expect(result).toContain('k-quote-card');
  });

  it('uses a dense two-column layout for four long quotes', () => {
    const long =
      'Une citation longue avec plusieurs propositions qui resterait illisible dans quatre colonnes étroites.';
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [
        { quote: lexical(long), authorName: 'A' },
        { quote: lexical(long), authorName: 'B' },
        { quote: lexical(long), authorName: 'C' },
        { quote: lexical(long), authorName: 'D' },
      ],
    });
    expect(result).toContain('k-grid-2');
    expect(result).toContain('k-content-tight');
    // 2x2 grid is only 2 rows, so force the tight quote typography explicitly.
    expect(result).toContain('k-card-stack--multirow k-tight');
  });

  it('uses the shared content header/body frame', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [{ quote: lexical('Q'), authorName: 'A' }],
    });
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main');
  });
});

describe('renderCta()', () => {
  it('renders with dark surface and buttons', () => {
    const result = renderCta({
      blockType: 'cta',
      title: 'Thank you',
      primaryAction: 'Get in touch',
      secondaryAction: 'Learn more',
    });
    expect(result).toContain('k-dark');
    expect(result).toContain('k-btn');
    expect(result).toContain('Get in touch');
    expect(result).toContain('k-btn-ghost');
  });

  it('renders subtitle and footer note (closing slide mode)', () => {
    const result = renderCta({
      blockType: 'cta',
      title: 'Thank you',
      subtitle: lexical('Questions?'),
      footerNote: lexical('site.example'),
    });
    expect(result).toContain('Thank you');
    expect(result).toContain('Questions?');
    expect(result).toContain('site.example');
  });

  it('handles all-empty optional fields', () => {
    const result = renderCta({ blockType: 'cta', title: 'Title' });
    expect(result).toContain('layout: center');
    expect(result).toContain('Title');
    expect(result).not.toContain('k-btn');
  });

  it('reserves a footer slot inside the full-height cta frame', () => {
    resetDefs();
    const result = renderCta({ blockType: 'cta', title: 'CTA {{def:Source}}' });
    expect(result).toContain('k-def-footer');
    expect(result).not.toContain('k-def-footer-slot');
    expect(result).toMatch(/k-center-hero[\s\S]*k-def-footer/);
  });
});

describe('renderAgenda()', () => {
  it('keeps short agendas at default density', () => {
    const result = renderAgenda({
      blockType: 'agenda',
      title: 'Agenda',
      items: [
        { label: 'One', description: null },
        { label: 'Two', description: null },
      ],
    });
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main');
    expect(result).not.toContain('k-agenda--dense');
  });

  it('switches long agendas to the dense layout', () => {
    const result = renderAgenda({
      blockType: 'agenda',
      title: 'Agenda',
      items: [
        { label: 'One', description: null },
        { label: 'Two', description: null },
        { label: 'Three', description: null },
        { label: 'Four', description: null },
        { label: 'Five', description: null },
        { label: 'Six', description: null },
      ],
    });
    expect(result).toContain('k-agenda--dense');
    expect(result).toContain('k-content-tight');
  });
});

describe('renderTimeline()', () => {
  it('keeps short timelines horizontal on a rail', () => {
    const result = renderTimeline({
      blockType: 'timeline',
      title: 'Process',
      steps: [
        { label: 'A', description: 'Short' },
        { label: 'B', description: 'Short' },
        { label: 'C', description: 'Short' },
        { label: 'D', description: null },
      ],
    });
    expect(result).toContain('k-content-header');
    expect(result).toContain('k-content-main');
    expect(result).toContain('k-timeline--horizontal');
    expect(result).toContain('--k-tl-count:4');
    expect(result).not.toContain('k-timeline--vertical');
    expect(result).not.toContain('k-timeline--cards');
    expect(result).not.toContain('k-tl-arrow');
    expect(result).not.toContain('→');
  });

  it('switches long or five-step timelines to a readable vertical rail', () => {
    const result = renderTimeline({
      blockType: 'timeline',
      title: 'Process',
      steps: [
        { label: 'A', description: 'Texte long qui doit rester lisible' },
        { label: 'B', description: 'Texte long qui doit rester lisible' },
        { label: 'C', description: 'Texte long qui doit rester lisible' },
        { label: 'D', description: 'Texte long qui doit rester lisible' },
        { label: 'E', description: 'Texte long qui doit rester lisible' },
      ],
      footer: 'À retenir',
    });
    expect(result).toContain('k-timeline--vertical');
    expect(result).toContain('--k-tl-count:5');
    expect(result).toContain('k-content-tight');
    expect(result).toContain('k-tl-band');
    expect(result).not.toContain('k-timeline--horizontal');
    expect(result).not.toContain('k-timeline--cards');
    // Rail connectors are CSS pseudo-elements, not inline arrow glyphs.
    expect(result).not.toContain('k-tl-arrow');
    expect(result).not.toContain('→');
  });

  it('renders an empty timeline container without throwing', () => {
    const result = renderTimeline({
      blockType: 'timeline',
      title: 'Process',
      steps: [],
    });

    expect(result).toContain('k-timeline k-timeline--horizontal');
    expect(result).toContain('--k-tl-count:1');
    expect(result).not.toContain('k-tl-band');
  });
});

describe('renderMermaid()', () => {
  it('emits a root-level mermaid fence inside the diagram slide layout', () => {
    const result = renderMermaid({
      blockType: 'mermaid',
      title: 'Diagram',
      source: 'flowchart TD\nA-->B',
    });
    expect(result).toContain('k-diagram-slide');
    expect(result).toContain('```mermaid');
    expect(result).toContain('flowchart TD');
    expect(result).not.toContain('<div class="mermaid">');
  });

  it('keeps definition footers in the diagram slide grid without wrapping the mermaid fence', () => {
    resetDefs();
    const result = renderMermaid({
      blockType: 'mermaid',
      title: 'Diagram {{def:Source}}',
      source: 'flowchart TD\nA-->B',
    });
    expect(result).toContain('k-diagram-slide');
    expect(result).toContain('k-def-footer');
    expect(result).not.toContain('k-def-footer-slot');
    expect(result).toContain('\n```mermaid');
  });

  it('rejects embedded markdown fences that would close the mermaid block', () => {
    expect(() =>
      renderMermaid({
        blockType: 'mermaid',
        title: 'Diagram',
        source: 'flowchart TD\nA-->B\n```\n# escaped',
      }),
    ).toThrow(/markdown fences/);
  });

  it('rejects standalone slide separators inside the diagram source', () => {
    expect(() =>
      renderMermaid({
        blockType: 'mermaid',
        title: 'Diagram',
        source: 'flowchart TD\nA-->B\n---\nB-->C',
      }),
    ).toThrow(/slide separators/);
  });
});

describe('renderMarkdown()', () => {
  it('passes content through without escaping and adds a safe default class', () => {
    const result = renderMarkdown({
      blockType: 'markdown',
      layout: 'center',
      content: '<div class="custom">Raw HTML</div>',
    });
    expect(result).toContain('layout: center');
    expect(result).toContain('class: relative k-markdown-slide');
    expect(result).toContain('<div class="custom">Raw HTML</div>');
  });

  it('includes frontmatter YAML and preserves the mandatory markdown rail class', () => {
    const result = renderMarkdown({
      blockType: 'markdown',
      layout: 'default',
      frontmatter: 'class: relative k-dark',
      content: '# Hello',
    });
    expect(result).toContain('layout: default');
    expect(result).toContain('class: relative k-dark k-markdown-slide');
    expect(result).toContain('# Hello');
  });

  it('rejects frontmatter boundary injection', () => {
    expect(() =>
      renderMarkdown({
        blockType: 'markdown',
        layout: 'default',
        frontmatter: 'class: ok\n---\nlayout: injected',
        content: '# Hello',
      }),
    ).toThrow(/YAML boundary/);
  });
});

describe('renderTable() — fixed-canvas fitting', () => {
  it('marks dense tables for fixed-canvas fitting', () => {
    const result = renderTable({
      blockType: 'table',
      title: 'Dense comparison',
      columns: Array.from({ length: 5 }, (_, index) => ({ header: `Column ${index + 1}` })),
      rows: Array.from({ length: 8 }, (_, rowIndex) => ({
        cells: Array.from({ length: 5 }, (_, columnIndex) => ({
          value: lexical(`Row ${rowIndex + 1}, column ${columnIndex + 1}`),
        })),
      })),
    });

    expect(result).toContain('k-table--fit');
    expect(result).toContain('k-density-compact');
    expect(result).toContain('k-content-main--stretch');
  });
});

describe('renderTable() — reference vs matrix variant + StatusPill (U10)', () => {
  const matrixTable = (statusText: string) => ({
    blockType: 'table' as const,
    title: 'Matrix',
    tableVariant: 'matrix' as const,
    columns: [{ header: 'Cas' }, { header: 'Statut' }],
    rows: [{ cells: [{ value: lexical('Salarié') }, { value: lexical(statusText) }] }],
  });

  it('reference variant (default) renders a plain table with no pills', () => {
    const r = renderTable({
      blockType: 'table',
      title: 'Ref',
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [{ cells: [{ value: lexical('x') }, { value: lexical('oui') }] }],
    });
    expect(r).not.toContain('k-pill');
    expect(r).not.toContain('k-table--matrix');
    expect(r).toContain('k-content-header');
    expect(r).toContain('k-content-main k-content-main--start');
  });

  it('matrix variant maps whole-cell status tokens to the right pill', () => {
    expect(renderTable(matrixTable('oui'))).toContain('k-pill--ok');
    expect(renderTable(matrixTable('✅'))).toContain('k-pill--ok');
    expect(renderTable(matrixTable('attention'))).toContain('k-pill--warn');
    expect(renderTable(matrixTable('non'))).toContain('k-pill--blocked');
    expect(renderTable(matrixTable('❌'))).toContain('k-pill--blocked');
    expect(renderTable(matrixTable('matrix'))).toContain('k-table--matrix');
  });

  it('does NOT pill a prose cell that merely contains a status word (no false positive)', () => {
    // "personne non organisée" contains "non" but is not a status token.
    const r = renderTable(matrixTable('personne non organisée'));
    expect(r).not.toContain('k-pill');
    expect(r).toContain('organis'); // the prose survives untouched
  });

  it('self-classifies status in ANY column, not a hardcoded index', () => {
    const r = renderTable({
      blockType: 'table',
      title: 'M',
      tableVariant: 'matrix',
      columns: [{ header: 'Statut' }, { header: 'Cas' }],
      rows: [{ cells: [{ value: lexical('oui') }, { value: lexical('Salarié') }] }],
    });
    expect(r).toContain('k-pill--ok'); // status in column 0 still gets a pill
  });
});
