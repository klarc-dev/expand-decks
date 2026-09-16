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
import { escape, md, resetDefs, splitTakeaway } from '../utils';
import { setVarDoc } from '../vars';

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

  it('marks a bracketed term as a heading highlight', () => {
    expect(md('[Klarc] : Avocats')).toBe('<mark class="k-mark">Klarc</mark> : Avocats');
  });

  it('keeps links out of the mark syntax', () => {
    expect(md('[Klarc](https://klarc.com) et [PI]')).toBe(
      '<a href="https://klarc.com">Klarc</a> et <mark class="k-mark">PI</mark>',
    );
  });

  it('keeps escaped brackets literal', () => {
    expect(md('art. \\[L. 611-1\\]')).toBe('art. [L. 611-1]');
  });

  it('allows bold inside a mark and marks several terms', () => {
    expect(md('[**Klarc**] à [Toulouse]')).toBe(
      '<mark class="k-mark"><strong>Klarc</strong></mark> à <mark class="k-mark">Toulouse</mark>',
    );
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

  it('renders an explicit figure column when image is set (print-safe, not CSS background)', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With photo',
      image: { url: '/media/photo.jpg' },
    });
    expect(result).toContain('layout: cover');
    expect(result).toContain('k-cover--split');
    expect(result).toContain('k-cover-figure');
    expect(result).toContain(`:src='"/media/photo.jpg"'`);
    // No Slidev image-right layout: its CSS background-image pane renders
    // blank in the Chromium print/export pass.
    expect(result).not.toContain('layout: image-right');
    expect(result).not.toContain('image: /media/photo.jpg');
    expect(result).not.toContain('k-cover--full-bleed');
    expect(result).not.toContain('p-14');
  });

  it('prefers the staged local media path for the cover image', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With staged photo',
      image: {
        filename: 'photo.jpg',
        url: 'https://slides.example/api/media/file/photo.jpg',
      },
    } as never);
    expect(result).toContain(`:src='"./media/photo.jpg"'`);
    expect(result).not.toContain('/api/media/file/photo.jpg');
  });

  it('flips the figure column left when imagePosition is left', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'With photo',
      image: { url: '/media/photo.jpg' },
      imagePosition: 'left',
    });
    expect(result).toContain('k-cover--split-left');
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
        { title: 'One', description: lexical('A'.repeat(340)) },
        { title: 'Two', description: lexical('B'.repeat(40)) },
        { title: 'Three', description: lexical('C'.repeat(40)) },
        { title: 'Four', description: lexical('D'.repeat(40)) },
      ],
    });

    expect(result).toContain('k-card-stack--multirow');
    expect(result).toContain('k-density-compact');
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
    expect(result).toContain('k-card-stack--crowded');
    expect(result).toContain('k-density-dense');
  });

  it('lays three dense quotes out as one 3-col row instead of stranding a quadrant', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Long quotes',
      quotes: [
        { quote: lexical('A'.repeat(180)), authorName: 'A' },
        { quote: lexical('B'.repeat(180)), authorName: 'B' },
        { quote: lexical('C'.repeat(180)), authorName: 'C' },
      ],
    });

    expect(result).toContain('k-grid-3');
    expect(result).not.toContain('k-grid-2');
  });
});

describe('renderSection()', () => {
  it('produces layout: center with a section-specific full-canvas centering frame', () => {
    const result = renderSection({
      blockType: 'section',
      title: 'Section Title',
    });
    expect(result).toContain('layout: center');
    expect(result).toContain('k-section-frame');
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

  it('renders the footer as a takeaway box whose cartouche is the "Label :" lead', () => {
    const result = renderStatement({
      blockType: 'statement',
      title: 'Statement',
      footer: lexical('L’enjeu : examiner ensemble les conséquences.'),
    });
    expect(result).toContain('k-takeaway');
    expect(result).toContain('<span class="k-takeaway-label">L’enjeu</span>');
    expect(result).toContain('<p>Examiner ensemble les conséquences.</p>');
    expect(result).not.toContain('<p>L’enjeu');
  });

  it('falls back to a localized cartouche when the footer has no lead', () => {
    const fr = renderStatement({
      blockType: 'statement',
      title: 'Statement',
      footer: lexical('Décider à partir d’une lecture commune.'),
    });
    expect(fr).toContain('<span class="k-takeaway-label">À retenir</span>');
    expect(fr).toContain('<p>Décider à partir d’une lecture commune.</p>');
    const en = renderStatement(
      { blockType: 'statement', title: 'Statement', footer: lexical('Decide from one reading.') },
      { language: 'en' },
    );
    expect(en).toContain('<span class="k-takeaway-label">Key takeaway</span>');
  });

  it('never turns a time or a URL opener into a cartouche', () => {
    expect(splitTakeaway('<p>10:30 kick-off</p>').label).toBe('À retenir');
    expect(splitTakeaway('<p>https://example.org/x</p>').label).toBe('À retenir');
    expect(splitTakeaway('<p><strong>Note</strong> : text</p>').label).toBe('À retenir');
    expect(splitTakeaway('<p>Note : text</p>')).toEqual({ label: 'Note', html: '<p>Text</p>' });
  });

  it('capitalises the sentence left after the cartouche lead', () => {
    expect(splitTakeaway('<p>L’enjeu : examiner ensemble vos choix.</p>')).toEqual({
      label: 'L’enjeu',
      html: '<p>Examiner ensemble vos choix.</p>',
    });
    expect(splitTakeaway('<p>Note : <strong>éviter</strong> le doublon</p>').html).toBe(
      '<p><strong>Éviter</strong> le doublon</p>',
    );
    expect(splitTakeaway('<p>Note : Déjà en capitale</p>').html).toBe('<p>Déjà en capitale</p>');
  });

  it('omits the takeaway box when there is no footer', () => {
    const result = renderStatement({ blockType: 'statement', title: 'Statement' });
    expect(result).not.toContain('k-takeaway');
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
    // The unified header separates the copy column: no vestigial accent rule.
    expect(result).toMatch(
      /k-content-header[\s\S]*k-content-main k-content-main--start[\s\S]*k-copy-stack--lead/,
    );
    expect(result).not.toContain('k-divider');
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
  });

  it('renders leftFooter as the same takeaway box as the statement footer', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Le problème des expertises dispersées',
      intro: lexical('Votre projet touche au droit et à la science.'),
      leftFooter: lexical('L’enjeu : examiner ensemble les conséquences de vos choix.'),
      rightCards: [{ title: 'Une seule équipe', description: lexical('Un même dossier.') }],
    });
    expect(result).toContain('k-takeaway k-takeaway--side'.split(' ')[0]);
    expect(result).toContain('k-takeaway--side');
    expect(result).toContain('<span class="k-takeaway-label">L’enjeu</span>');
    expect(result).toContain('<p>Examiner ensemble les conséquences de vos choix.</p>');
    expect(result).not.toContain('k-copy-stack--note');
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
    expect(result).toContain('<div class="k-card k-card--numbered">');
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

    expect(result).toMatch(/k-density-(compact|dense)/);
    expect(result).not.toContain('k-card-scale-');
  });

  it('renders sidebarText as the description line of the unified header, above the cards', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      sidebarText: lexical('Contexte de la partie'),
      cards: oneCard,
    });
    // The lead is a structural band in the body, not a right-aligned header aside.
    expect(result).toContain('k-header-lead');
    expect(result).toContain('Contexte de la partie');
    expect(result).not.toContain('k-content-header--split');
    expect(result).not.toContain('k-side-note');
    // Lead reads before the card grid so the slide has a clear top-down hierarchy.
    expect(result.indexOf('k-header-lead')).toBeLessThan(result.indexOf('k-card-stack'));
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

  it('renders intervenants as a shared person-card strip below the cards', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
      intervenants: [
        {
          user: {
            id: 1,
            name: 'Joachim Brindeau',
            title: 'Avocat',
          },
        },
      ],
    });
    expect(result).toContain('k-cardgrid-people');
    expect(result).toContain('k-person-card');
    expect(result).toContain('Joachim Brindeau');
    expect(result).toContain('Avocat');
    // Initials fallback when no avatar media is linked.
    expect(result).toContain('k-person-initials');
    expect(result).toContain('JB');
    // The strip reads after the card grid: discreet footer, not a fourth card.
    expect(result.indexOf('k-card-stack')).toBeLessThan(result.indexOf('k-cardgrid-people'));
  });

  it('renders each contact detail of an intervenant and links their identity to the public profile', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
      intervenants: [
        {
          user: {
            id: 1,
            name: 'Joachim Brindeau',
            title: 'Avocat',
            email: 'joachim@klarc.com',
            phone: '06 12 34 56 78',
            linkedin: 'https://www.linkedin.com/in/joachim',
            website: 'https://klarc.com/equipe/joachim-brindeau',
          },
        },
      ],
    });
    expect(result).toContain(
      '<div class="k-person-name"><a href="https://klarc.com/equipe/joachim-brindeau">Joachim Brindeau</a></div>',
    );
    // Assert each link's destination and readable label together, independent
    // of decorative SVG paths or the span used to lay out the label.
    const contacts = Array.from(
      result.matchAll(/<a class="k-person-link" href="([^"]+)" aria-label="([^"]+)"[^>]*>/g),
      ([, href, label]) => ({ href, text: label }),
    );
    expect(contacts).toEqual([
      { href: 'mailto:joachim@klarc.com', text: 'joachim@klarc.com' },
      { href: 'tel:0612345678', text: '06 12 34 56 78' },
      { href: 'https://www.linkedin.com/in/joachim', text: 'LinkedIn' },
      { href: 'https://klarc.com/equipe/joachim-brindeau', text: 'Profil Klarc' },
    ]);
  });

  it('keeps the plain card and drops unsafe contact targets when details are missing or invalid', () => {
    const plain = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
      intervenants: [{ user: { id: 1, name: 'Sans Contact', title: 'Avocat' } }],
    });
    expect(plain).not.toContain('k-person-contact');
    expect(plain).not.toContain('<a ');
    const unsafe = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
      intervenants: [
        {
          user: {
            id: 1,
            name: 'Mauvais Liens',
            phone: 'à définir',
            linkedin: 'javascript:alert(1)',
          },
        },
      ],
    });
    expect(unsafe).not.toContain('k-person-contact');
    expect(unsafe).not.toContain('javascript:');
  });

  it('omits the person strip when intervenants are absent or unresolved', () => {
    const absent = renderCardGrid({ blockType: 'cardGrid', title: 'Grid', cards: oneCard });
    expect(absent).not.toContain('k-cardgrid-people');
    const unresolved = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
      intervenants: [{ user: 42 }],
    });
    expect(unresolved).not.toContain('k-cardgrid-people');
  });

  it('promotes the person strip to a prominent grid when there are no cards', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Vos contacts',
      intervenants: [
        { user: { id: 1, name: 'Joachim Brindeau', title: 'Avocat' } },
        { user: { id: 2, name: 'Lucien Trouette', title: 'Conseil en Propriété Industrielle' } },
      ],
    });
    expect(result).toContain('k-cardgrid-people--grid');
    // People are the slide's content: centered, not stretched.
    expect(result).toContain('k-content-main--center');
    expect(result).not.toContain('k-card-stack');
  });

  it('omits the lead band when no sidebarText is provided', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).not.toContain('k-header-lead');
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

describe('unified content header', () => {
  it('renders the lead description inside the shared header on every content block', () => {
    const lead = lexical('Une phrase d’introduction.');
    const cases = [
      renderQuotes({ blockType: 'quotes', title: 'Q', lead, quotes: [] }),
      renderTimeline({ blockType: 'timeline', title: 'T', lead, steps: [{ label: 'A' }] }),
      renderTable({
        blockType: 'table',
        title: 'Tb',
        lead,
        columns: [{ header: 'H' }],
        rows: [{ cells: [{ value: lexical('c') }] }],
      }),
      renderStats({ blockType: 'stats', title: 'S', lead, stats: [{ value: '1', label: 'l' }] }),
      renderAgenda({ blockType: 'agenda', title: 'Ag', lead, items: [{ label: 'x' }] }),
    ];
    for (const html of cases) {
      expect(html).toMatch(
        /<header class="k-content-header[^"]*">[\s\S]*<div class="k-header-lead">/,
      );
      expect(html).toContain('Une phrase d’introduction.');
    }
  });
});

describe('renderQuotes()', () => {
  it('separates an escaped company from the role and omits empty companies', () => {
    const render = (authorCompany?: string | null) =>
      renderQuotes({
        blockType: 'quotes',
        title: 'References',
        quotes: [
          {
            quote: lexical('A recommendation'),
            authorName: 'Alex',
            authorRole: 'Director',
            authorCompany,
          },
        ],
      });
    expect(render('Research & <Partners>')).toContain(
      '<span class="k-author-company">Research &amp; &lt;Partners&gt;</span>',
    );
    expect(render('Company').indexOf('Director')).toBeLessThan(
      render('Company').indexOf('k-author-company'),
    );
    for (const company of [undefined, null, '', '   '])
      expect(render(company)).not.toContain('k-author-company');
  });

  it('keeps company footers aligned and contained in light and dark quote cards', async () => {
    const { chromium } = await import('playwright');
    const { readFileSync } = await import('node:fs');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const seed = readFileSync('scripts/seed-klarc-prospects.ts', 'utf8');
      const quotes = [
        ...seed.matchAll(
          /quote:\s*(['"])(.*?)\1,\s*authorName:\s*(['"])(.*?)\3,\s*(?:authorRole:\s*(['"])(.*?)\5,\s*)?authorCompany:\s*(['"])(.*?)\7/g,
        ),
      ].map((m) => ({
        quote: lexical(m[2]!),
        authorName: m[4]!,
        authorRole: m[6],
        authorCompany: m[8]!,
      }));
      expect(quotes).toHaveLength(3);
      const css = readFileSync('src/export/style.css', 'utf8').replace(
        /url\("\/fonts\/([^"/]+)"\)/g,
        (_, filename: string) =>
          `url("data:font/ttf;base64,${readFileSync(`public/fonts/${filename}`).toString('base64')}")`,
      );
      for (const surface of ['light', 'dark'] as const) {
        const html = renderQuotes(
          { blockType: 'quotes', title: 'Ils nous font confiance', quotes },
          { surface },
        ).replace(/^---\n[\s\S]*?\n---\n*/, '');
        await page.setContent(
          `<style>html,body{margin:0}.slidev-layout p{margin:0}${css}</style><div class="slidev-layout ${surface === 'dark' ? 'k-dark' : ''}" style="width:1280px;height:720px">${html}</div>`,
        );
        await page.evaluate(() => document.fonts.ready);
        const data = await page.locator('.k-quote-card').evaluateAll((cards) =>
          cards.map((card) => {
            const company = card.querySelector('.k-author-company')!;
            const bounds = card.getBoundingClientRect();
            const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
            let contained = true;
            while (walker.nextNode()) {
              if (!walker.currentNode.textContent?.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(walker.currentNode);
              for (const rect of range.getClientRects())
                if (
                  rect.left < bounds.left - 1 ||
                  rect.right > bounds.right + 1 ||
                  rect.bottom > bounds.bottom + 1
                )
                  contained = false;
            }
            return {
              bottom: company.getBoundingClientRect().bottom,
              weight: getComputedStyle(company).fontWeight,
              contained,
            };
          }),
        );
        expect(data.every((d) => d.contained && d.weight === '600')).toBe(true);
        expect(
          Math.max(...data.map((d) => d.bottom)) - Math.min(...data.map((d) => d.bottom)),
        ).toBeLessThan(1);
        await page.screenshot({ path: `/tmp/testimonial-companies-${surface}.png` });
      }
    } finally {
      await browser.close();
    }
  });
  it('renders quotes with author info', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [{ quote: lexical('Great service'), authorName: 'John', authorRole: 'CEO' }],
    });
    expect(result).toContain('Great service');
    expect(result).toContain('<span class="k-quote-mark"><svg viewBox="0 0 24 24"');
    expect(result).toContain('John');
    expect(result).toContain('CEO');
  });

  it('renders an optional safe link to the full testimonial list', () => {
    const result = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [{ quote: lexical('Great service'), authorName: 'John' }],
      linkLabel: 'Voir d’autres témoignages',
      linkUrl: 'https://klarc.com/identite/temoignages',
    });
    expect(result).toContain('k-content-main k-content-main--stretch');
    expect(result).toContain('<div class="k-quotes-body">');
    expect(result).toContain(
      '<a class="k-btn-ghost" href="https://klarc.com/identite/temoignages">Voir d’autres témoignages</a>',
    );
    const unsafe = renderQuotes({
      blockType: 'quotes',
      title: 'Quotes',
      quotes: [],
      linkLabel: 'Voir',
      linkUrl: 'javascript:alert(1)',
    });
    expect(unsafe).not.toContain('k-quote-footer');
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
    expect(result).toContain('k-card-stack--multirow k-card-stack--crowded');
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
  it('renders only the primary action even for legacy two-action data', () => {
    const block = {
      blockType: 'cta' as const,
      title: 'Thank you',
      primaryAction: 'Get in touch',
      secondaryAction: 'Learn more',
      secondaryActionUrl: 'https://example.com/legacy',
    };
    const result = renderCta(block);
    expect(result).toContain('k-dark');
    expect(result).toContain('<div class="k-btn">Get in touch</div>');
    expect(result).not.toContain('k-btn-ghost');
    expect(result).not.toContain('Learn more');
    expect(result).not.toContain('/legacy');
    expect(result).toBe(
      renderCta({ blockType: 'cta', title: block.title, primaryAction: block.primaryAction }),
    );
    expect(renderCta({ ...block, primaryAction: null })).not.toContain('k-cta-actions');
  });

  it.each(['https://example.com/book', 'mailto:contact@example.com', 'tel:+33561000000'])(
    'renders the sole action with a safe target: %s',
    (url) => {
      const result = renderCta({
        blockType: 'cta',
        title: 'Contact',
        primaryAction: 'Contact us',
        primaryActionUrl: url,
      });
      expect(result).toContain(`<a class="k-btn" href="${url}">Contact us</a>`);
      expect(result.match(/class="k-btn"/g)).toHaveLength(1);
    },
  );

  it('refuses unsafe action targets', () => {
    const result = renderCta({
      blockType: 'cta',
      title: 'Contact',
      primaryAction: 'Cliquer',
      primaryActionUrl: 'javascript:alert(1)',
    });
    expect(result).toContain('<div class="k-btn">Cliquer</div>');
    expect(result).not.toContain('javascript:');
  });

  it('resolves a {org.bookingUrl} variable before linking the button', () => {
    setVarDoc({ org: { bookingUrl: 'https://cal.klarc.com/team' } });
    try {
      const result = renderCta({
        blockType: 'cta',
        title: 'Parlons-en',
        primaryAction: 'Prendre rendez-vous',
        primaryActionUrl: '{org.bookingUrl}',
      });
      expect(result).toContain('href="https://cal.klarc.com/team"');
    } finally {
      setVarDoc(null);
    }
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
    expect(result).toContain('k-density-dense');
    expect(result).toContain('k-content-main--start');
    expect(result).toContain('k-table-stage');
    expect(result).toContain('k-table--cols-5');
  });

  it('promotes a few exceptionally long cells to the dense table tier', () => {
    const result = renderTable({
      blockType: 'table',
      title: 'Long-form comparison',
      columns: Array.from({ length: 5 }, (_, index) => ({ header: `Column ${index + 1}` })),
      rows: Array.from({ length: 3 }, (_, rowIndex) => ({
        cells: Array.from({ length: 5 }, (_, columnIndex) => ({
          value: lexical(
            rowIndex === 1 && columnIndex === 4
              ? 'A deliberately long operational explanation '.repeat(8)
              : `Short ${rowIndex + 1}-${columnIndex + 1}`,
          ),
        })),
      })),
    });

    expect(result).toContain('k-table--fit');
    expect(result).toContain('k-density-dense');
    expect(result).toContain('k-content k-content-tight k-content--full k-density-dense');
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
    expect(renderTable(matrixTable('oui'))).toContain('k-table--has-status');
    expect(renderTable(matrixTable('oui'))).toContain('k-table-cell--status');
  });

  it('keeps prose matrix columns left-aligned and only marks semantic status cells', () => {
    const result = renderTable({
      blockType: 'table',
      title: 'Eligibility',
      tableVariant: 'matrix',
      columns: [
        { header: 'Asset' },
        { header: 'Protection' },
        { header: 'Legal test' },
        { header: 'Status' },
      ],
      rows: [
        {
          cells: [
            { value: lexical('Patent') },
            { value: lexical('Industrial property title') },
            { value: lexical('Title must remain in force') },
            { value: lexical('attention') },
          ],
        },
      ],
    });
    expect(result).toContain('k-table--cols-4');
    expect(result.match(/k-table-cell--status/g)).toHaveLength(1);
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
