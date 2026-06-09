import { describe, expect, it } from 'vitest';

import { renderCardGrid } from '../blocks/cardGrid';
import { renderCover } from '../blocks/cover';
import { renderCta } from '../blocks/cta';
import { renderMarkdown } from '../blocks/markdown';
import { renderQuotes } from '../blocks/quotes';
import { renderSection } from '../blocks/section';
import { renderStatement } from '../blocks/statement';
import { renderStats } from '../blocks/stats';
import { renderTable } from '../blocks/table';
import { renderTwoCols } from '../blocks/twoCols';
import { escape, md } from '../utils';

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

  it('applies dark surface by default', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Test',
    });
    expect(result).toContain('k-dark');
  });

  it('omits dark class for light surface', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'Test',
      surface: 'light',
    });
    expect(result).not.toContain('k-dark');
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
      footerLeft: null,
      footerRight: null,
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
    expect(result).not.toContain('absolute inset-0');
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

  it('keeps layout: cover with absolute positioning when no image', () => {
    const result = renderCover({
      blockType: 'cover',
      title: 'No image',
    });
    expect(result).toContain('layout: cover');
    expect(result).toContain('absolute inset-0');
    expect(result).not.toContain('image:');
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
    expect(result).not.toContain('text-center max-w-5xl');
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
});

describe('renderTwoCols()', () => {
  it('produces layout: default with k-split', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'Two Cols',
    });
    expect(result).toContain('layout: default');
    expect(result).toContain('k-split');
  });

  it('renders right cards', () => {
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
  });

  it('emits image-right and drops k-split + rightCards when image is set', () => {
    const result = renderTwoCols({
      blockType: 'twoCols',
      title: 'TwoCols with photo',
      intro: lexical('Some intro'),
      image: { url: '/media/photo.jpg' },
      rightCards: [{ title: 'Should be ignored', description: lexical('And so should this') }],
    });
    expect(result).toContain('layout: image-right');
    expect(result).toContain('image: /media/photo.jpg');
    expect(result).not.toContain('k-split');
    expect(result).not.toContain('Should be ignored');
    expect(result).toContain('Some intro');
  });
});

describe('renderCardGrid()', () => {
  const oneCard = [{ title: 'A', description: lexical('Desc') }];

  it('uses k-grid-4 by default', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: oneCard,
    });
    expect(result).toContain('k-grid-4');
  });

  it('respects columns setting', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      columns: '3',
      cards: oneCard,
    });
    expect(result).toContain('k-grid-3');
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
    for (const n of ['01', '02', '03', '04', '05', '06']) {
      expect(result).toContain(`>${n}<`);
    }
    for (const t of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(result).toContain(`>${t}<`);
    }
  });
});

describe('renderStats()', () => {
  it('produces dark surface by default', () => {
    const result = renderStats({
      blockType: 'stats',
      title: 'Stats',
    });
    expect(result).toContain('k-dark');
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
});

describe('renderMarkdown()', () => {
  it('passes content through without escaping', () => {
    const result = renderMarkdown({
      blockType: 'markdown',
      layout: 'center',
      content: '<div class="custom">Raw HTML</div>',
    });
    expect(result).toContain('layout: center');
    expect(result).toContain('<div class="custom">Raw HTML</div>');
  });

  it('includes frontmatter YAML', () => {
    const result = renderMarkdown({
      blockType: 'markdown',
      layout: 'default',
      frontmatter: 'class: relative k-dark',
      content: '# Hello',
    });
    expect(result).toContain('layout: default');
    expect(result).toContain('class: relative k-dark');
    expect(result).toContain('# Hello');
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
