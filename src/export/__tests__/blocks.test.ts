import { describe, expect, it } from 'vitest';

import { renderCardGrid } from '../blocks/cardGrid';
import { renderCover } from '../blocks/cover';
import { renderCta } from '../blocks/cta';
import { renderMarkdown } from '../blocks/markdown';
import { renderQuotes } from '../blocks/quotes';
import { renderSection } from '../blocks/section';
import { renderStatement } from '../blocks/statement';
import { renderStats } from '../blocks/stats';
import { renderTwoCols } from '../blocks/twoCols';
import { escape, md } from '../utils';

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
    expect(md('[Klarc](https://klarc.com)')).toBe(
      '<a href="https://klarc.com">Klarc</a>',
    );
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

describe('renderStatement()', () => {
  it('produces layout: center', () => {
    const result = renderStatement({
      blockType: 'statement',
      title: 'Statement',
    });
    expect(result).toContain('layout: center');
    expect(result).toContain('Statement');
  });

  it('omits body when not provided', () => {
    const result = renderStatement({
      blockType: 'statement',
      title: 'Statement',
    });
    expect(result).not.toContain('text-xl leading-relaxed');
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
        { title: 'Card 1', description: 'Desc 1' },
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
      intro: 'Some intro',
      image: { url: '/media/photo.jpg' },
      rightCards: [{ title: 'Should be ignored', description: 'And so should this' }],
    });
    expect(result).toContain('layout: image-right');
    expect(result).toContain('image: /media/photo.jpg');
    expect(result).not.toContain('k-split');
    expect(result).not.toContain('Should be ignored');
    expect(result).toContain('Some intro');
  });
});

describe('renderCardGrid()', () => {
  it('uses k-grid-4 by default', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
    });
    expect(result).toContain('k-grid-4');
  });

  it('respects columns setting', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      columns: '3',
    });
    expect(result).toContain('k-grid-3');
  });

  it('renders all cards with their numbers and titles', () => {
    const result = renderCardGrid({
      blockType: 'cardGrid',
      title: 'Grid',
      cards: [
        { number: '01', title: 'A', description: 'Desc A' },
        { number: '02', title: 'B', description: 'Desc B' },
        { number: '03', title: 'C', description: 'Desc C' },
        { number: '04', title: 'D', description: 'Desc D' },
        { number: '05', title: 'E', description: 'Desc E' },
        { number: '06', title: 'F', description: 'Desc F' },
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
      quotes: [
        { quote: 'Great service', authorName: 'John', authorRole: 'CEO' },
      ],
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
      subtitle: 'Questions?',
      footerNote: 'site.example',
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
