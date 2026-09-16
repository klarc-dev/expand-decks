import { describe, expect, it } from 'vitest';

import { slideTone } from '../slideTone';
describe('slideTone()', () => {
  it('owns a gradient surface for cover slides', () => {
    expect(slideTone('cover')).toBe('gradient');
  });

  it('owns dark surfaces for full-bleed emphasis templates', () => {
    for (const blockType of ['section', 'statement', 'cta']) {
      expect(slideTone(blockType)).toBe('dark');
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
    ]) {
      expect(slideTone(blockType)).toBe('light');
    }
  });

  it('does not accept neighbouring tone state', () => {
    expect(slideTone.length).toBe(1);
  });
});
