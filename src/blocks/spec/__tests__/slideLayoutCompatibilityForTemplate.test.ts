import { describe, expect, it } from 'vitest';

import { slideLayoutCompatibilityForTemplate } from '../slideLayoutCompatibilityForTemplate';

describe('slideLayoutCompatibilityForTemplate()', () => {
  it('assesses only layouts allowed by the document template', () => {
    const results = slideLayoutCompatibilityForTemplate(
      { blockType: 'statement', title: 'Un message' },
      'visual-publication',
    );

    expect(results.map((result) => result.layout)).toEqual([
      'statement',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
    ]);
    expect(results.some((result) => result.layout === 'table')).toBe(false);
  });
});
