import { describe, expect, it } from 'vitest';

import { slideTone } from '../slideTone';
import type { Surface } from '../utils';

describe('slideTone()', () => {
  it('owns a gradient surface for cover slides', () => {
    expect(slideTone('cover', null)).toBe('gradient');
  });

  it('owns dark surfaces for full-bleed emphasis templates', () => {
    for (const blockType of ['section', 'statement', 'cta']) {
      expect(slideTone(blockType, 'light')).toBe('dark');
    }
  });

  it('owns light surfaces for information-dense templates', () => {
    for (const blockType of [
      'agenda',
      'table',
      'twoCols',
      'cardGrid',
      'stats',
      'timeline',
      'quotes',
      'mermaid',
      'markdown',
    ]) {
      expect(slideTone(blockType, 'dark')).toBe('light');
    }
  });

  it('does not vary a template surface based on neighbouring slides', () => {
    const previousTones: Array<Surface | null> = [null, 'light', 'dark', 'gradient'];
    expect(previousTones.map((tone) => slideTone('statement', tone))).toEqual([
      'dark',
      'dark',
      'dark',
      'dark',
    ]);
  });
});
