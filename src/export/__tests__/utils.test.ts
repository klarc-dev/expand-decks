import { describe, expect, it } from 'vitest';

import {
  card,
  cardStack,
  contentFrame,
  heroFrame,
  resetDefs,
  slideHeader,
  surfaceClass,
  wrapSlide,
} from '../utils';

describe('surfaceClass()', () => {
  it('maps light to a bare relative class (no dark wash)', () => {
    expect(surfaceClass('light')).toBe('relative');
  });

  it('maps dark to the solid dark surface', () => {
    expect(surfaceClass('dark')).toBe('relative k-dark');
  });

  it('gives gradient a distinct class so it differs from plain dark', () => {
    const gradient = surfaceClass('gradient');
    expect(gradient).toContain('k-dark');
    expect(gradient).toContain('k-gradient');
    expect(gradient).not.toBe(surfaceClass('dark'));
  });
});

describe('slideHeader()', () => {
  it('emits eyebrow + title with the lg heading scale by default', () => {
    const h = slideHeader({ eyebrow: 'TAG', title: 'Title' });
    expect(h).toContain('k-eyebrow');
    expect(h).toContain('TAG');
    expect(h).toContain('k-h-lg');
    expect(h).toContain('Title');
  });

  it('uses the md scale when requested', () => {
    expect(slideHeader({ title: 'T', size: 'md' })).toContain('k-h-md');
  });

  it('omits the eyebrow cleanly when null', () => {
    const h = slideHeader({ eyebrow: null, title: 'T' });
    expect(h).not.toContain('k-eyebrow');
    expect(h).toContain('T');
  });

  it('places a sidebar in the semantic split header when provided', () => {
    const h = slideHeader({ title: 'T', sidebar: '<aside>side</aside>' });
    expect(h).toContain('k-content-header--split');
    expect(h).toContain('side');
  });
});

describe('card()', () => {
  it('emits the k-card box with number, title and body', () => {
    const c = card({ number: '01', title: 'Card', body: '<p>Body</p>' });
    expect(c).toContain('k-card');
    expect(c).toContain('k-num');
    expect(c).toContain('01');
    expect(c).toContain('Card');
    expect(c).toContain('Body');
  });

  it('omits number and body slots when absent', () => {
    const c = card({ title: 'Bare' });
    expect(c).not.toContain('k-num');
    expect(c).toContain('Bare');
    // no empty body div
    expect(c).not.toContain('<div></div>');
  });
});

describe('cardStack()', () => {
  it('grid of 4 cards in 2 cols is crowded (3 rows would be), 4 cols is not', () => {
    const four = ['a', 'b', 'c', 'd'];
    expect(
      cardStack(four, {
        layout: 'grid',
        maxCols: 2,
        profile: 'card-grid',
        itemPressures: [1, 1, 1, 1],
      }).crowded,
    ).toBe(false); // 2 rows
    expect(
      cardStack(['a', 'b', 'c', 'd', 'e'], {
        layout: 'grid',
        maxCols: 2,
        profile: 'card-grid',
        itemPressures: [1, 1, 1, 1, 1],
      }).crowded,
    ).toBe(true); // 3 rows
    expect(
      cardStack(four, {
        layout: 'grid',
        maxCols: 4,
        profile: 'card-grid',
        itemPressures: [1, 1, 1, 1],
      }).crowded,
    ).toBe(false); // 1 row
  });

  it('column of 4+ cards is crowded and gets the crowded class', () => {
    const r = cardStack(['a', 'b', 'c', 'd'], {
      layout: 'column',
      profile: 'two-cols',
      itemPressures: [1, 1, 1, 1],
    });
    expect(r.crowded).toBe(true);
    expect(r.html).toContain('k-card-stack--crowded');
  });

  it('column of 3 cards is not crowded', () => {
    const r = cardStack(['a', 'b', 'c'], {
      layout: 'column',
      profile: 'two-cols',
      itemPressures: [1, 1, 1],
    });
    expect(r.crowded).toBe(false);
    expect(r.html).not.toContain('k-card-stack--crowded');
  });

  it('keeps occupancy-driven density when a stack has no cards', () => {
    const result = cardStack([], {
      layout: 'column',
      profile: 'two-cols',
      itemPressures: [],
      occupancy: { header: 'H'.repeat(300), intro: 'I'.repeat(300) },
    });
    expect(result.html).toBe('');
    expect(result.density).toBe('dense');
  });

  it('balances five and six cards into three columns behind the stack interface', () => {
    for (const count of [5, 6]) {
      const result = cardStack(
        Array.from({ length: count }, (_, index) => String(index)),
        {
          layout: 'grid',
          maxCols: 4,
          profile: 'card-grid',
          itemPressures: Array.from({ length: count }, () => 1),
        },
      );
      expect(result.cols).toBe(3);
      expect(result.rows).toBe(2);
      expect(result.html).toContain('k-grid-3');
    }
  });

  it('marks only five-card three-column grids for a centered final row', () => {
    const five = cardStack(['a', 'b', 'c', 'd', 'e'], {
      layout: 'grid',
      maxCols: 4,
      profile: 'card-grid',
      itemPressures: [1, 1, 1, 1, 1],
    });
    const six = cardStack(['a', 'b', 'c', 'd', 'e', 'f'], {
      layout: 'grid',
      maxCols: 4,
      profile: 'card-grid',
      itemPressures: [1, 1, 1, 1, 1, 1],
    });
    expect(five.html).toContain('k-card-stack--centered-last-row');
    expect(six.html).not.toContain('k-card-stack--centered-last-row');
  });

  it('rejects pressure metadata that does not match the cards', () => {
    expect(() =>
      cardStack(['a', 'b'], {
        layout: 'grid',
        maxCols: 2,
        profile: 'card-grid',
        itemPressures: [1],
      }),
    ).toThrow('cardStack itemPressures must match cards');
  });

  it('clamps requested columns and sparse grids to their actual card count', () => {
    expect(
      cardStack(['a'], {
        layout: 'grid',
        maxCols: 1,
        profile: 'card-grid',
        itemPressures: [1],
      }).html,
    ).toContain('k-grid-1');
    expect(
      cardStack(['a'], {
        layout: 'grid',
        maxCols: 9,
        profile: 'card-grid',
        itemPressures: [1],
      }).html,
    ).toContain('k-grid-1');
  });
});

describe('contentFrame()', () => {
  it('wraps in the k-content rail and adds tight/full modifiers', () => {
    expect(contentFrame('X')).toContain('k-content');
    expect(contentFrame('X', { crowded: true })).toContain('k-content-tight');
    expect(contentFrame('X', { wFull: true })).toContain('k-content--full');
  });

  it('separates the stable header row from the measured main row', () => {
    const html = contentFrame('Body', { header: '<header>Title</header>', mainAlign: 'start' });
    expect(html).toContain('<header>Title</header>');
    expect(html).toContain('k-content-main');
    expect(html).toContain('k-content-main--start');
    expect(html.indexOf('<header>Title</header>')).toBeLessThan(html.indexOf('Body'));
  });

  it('keeps generated definition footers inside the full-height content frame', () => {
    resetDefs();
    const body = contentFrame('Body', { header: slideHeader({ title: 'Title {{def:Source}}' }) });
    const html = wrapSlide({ body });
    expect(html).toContain('k-def-footer');
    expect(html).not.toContain('k-def-footer-slot');
    expect(html).toMatch(/<div class="k-content"[\s\S]*<div class="k-def-footer">/);
  });
});

describe('heroFrame() — statement-only variant surface', () => {
  it('center/hero produces a centered layout at hero scale', () => {
    const h = heroFrame({ title: 'T', scale: 'hero', align: 'center' });
    expect(h).toContain('layout: center');
    expect(h).toContain('k-hero--hero');
    expect(h).toContain('k-hero--center');
  });

  it('big-statement uses left align + display scale', () => {
    const h = heroFrame({ title: 'T', scale: 'display', align: 'left' });
    expect(h).toContain('k-hero--display');
    expect(h).toContain('k-hero--left');
    expect(h).toContain('layout: default');
  });

  it('pull-quote emits the accent rule', () => {
    const h = heroFrame({ title: 'T', scale: 'title', align: 'left', accentRule: true });
    expect(h).toContain('k-divider');
  });

  it('split uses the k-split two-column grid', () => {
    const h = heroFrame({ title: 'T', body: '<p>b</p>', scale: 'title', align: 'split' });
    expect(h).toContain('k-split');
  });

  it('renders the body in a clampable k-hero-body column (overflow contract)', () => {
    const h = heroFrame({ title: 'T', body: '<p>long</p>', scale: 'display', align: 'left' });
    expect(h).toContain('k-hero-body');
    expect(h).toContain('long');
  });

  it('passes surface through to the wrapper class', () => {
    expect(heroFrame({ title: 'T', scale: 'hero', align: 'center', surface: 'dark' })).toContain(
      'k-dark',
    );
    expect(
      heroFrame({ title: 'T', scale: 'hero', align: 'center', surface: 'light' }),
    ).not.toContain('k-dark');
  });
});
