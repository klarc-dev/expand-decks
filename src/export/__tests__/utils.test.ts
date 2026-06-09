import { describe, expect, it } from 'vitest';

import { card, cardStack, contentFrame, heroFrame, slideHeader } from '../utils';

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

  it('places a sidebar in a justify-between row when provided', () => {
    const h = slideHeader({ title: 'T', sidebar: '<aside>side</aside>' });
    expect(h).toContain('justify-between');
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
    expect(cardStack(four, { layout: 'grid', cols: 2 }).crowded).toBe(false); // 2 rows
    expect(cardStack(['a', 'b', 'c', 'd', 'e'], { layout: 'grid', cols: 2 }).crowded).toBe(true); // 3 rows
    expect(cardStack(four, { layout: 'grid', cols: 4 }).crowded).toBe(false); // 1 row
  });

  it('column of 4+ cards is crowded and gets the tight class', () => {
    const r = cardStack(['a', 'b', 'c', 'd'], { layout: 'column' });
    expect(r.crowded).toBe(true);
    expect(r.html).toContain('k-tight');
  });

  it('column of 3 cards is not crowded', () => {
    const r = cardStack(['a', 'b', 'c'], { layout: 'column' });
    expect(r.crowded).toBe(false);
    expect(r.html).not.toContain('k-tight');
  });

  it('grid uses a clamped gridClass', () => {
    expect(cardStack(['a'], { layout: 'grid', cols: 1 }).html).toContain('k-grid-2');
    expect(cardStack(['a'], { layout: 'grid', cols: 9 }).html).toContain('k-grid-4');
  });
});

describe('contentFrame()', () => {
  it('wraps in the k-content rail and adds tight/w-full modifiers', () => {
    expect(contentFrame('X')).toContain('k-content');
    expect(contentFrame('X', { crowded: true })).toContain('k-content-tight');
    expect(contentFrame('X', { wFull: true })).toContain('w-full');
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
    expect(heroFrame({ title: 'T', scale: 'hero', align: 'center', surface: 'dark' })).toContain('k-dark');
    expect(heroFrame({ title: 'T', scale: 'hero', align: 'center', surface: 'light' })).not.toContain('k-dark');
  });
});
