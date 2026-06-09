import { describe, expect, it } from 'vitest';

import { slideTone } from '../slideTone';
import type { Surface } from '../utils';

describe('slideTone()', () => {
  it('resolves role-dark blocks to dark regardless of previous tone', () => {
    for (const t of ['section', 'cover', 'cta']) {
      expect(slideTone(t, null)).toBe('dark');
      expect(slideTone(t, 'light')).toBe('dark');
      expect(slideTone(t, 'dark')).toBe('dark');
    }
  });

  it('resolves content blocks to light', () => {
    for (const t of ['table', 'twoCols', 'cardGrid', 'stats', 'timeline', 'quotes', 'markdown']) {
      expect(slideTone(t, 'dark')).toBe('light');
    }
  });

  it('alternates a statement against the previous resolved tone', () => {
    expect(slideTone('statement', 'dark')).toBe('light');
    expect(slideTone('statement', 'light')).toBe('dark');
    expect(slideTone('statement', null)).toBe('dark'); // first statement
  });

  it('keeps adjacent statements on opposite tones across a fold', () => {
    // statement → statement → statement should alternate dark/light/dark
    let prev: Surface | null = null;
    const tones = ['statement', 'statement', 'statement'].map((t) => {
      const tone = slideTone(t, prev);
      prev = tone;
      return tone;
    });
    expect(tones).toEqual(['dark', 'light', 'dark']);
  });

  it('a statement after a dark section resolves light (no 3-in-a-row dark)', () => {
    // section(dark) → statement: the statement must NOT also be dark.
    const sectionTone = slideTone('section', 'light'); // dark
    expect(slideTone('statement', sectionTone)).toBe('light');
  });
});
