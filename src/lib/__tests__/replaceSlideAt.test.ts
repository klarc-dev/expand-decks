import { describe, expect, it } from 'vitest';

import { replaceSlideAt } from '../replaceSlideAt';

describe('replaceSlideAt', () => {
  it('replaces only the requested slide and preserves storage metadata', () => {
    const slides = [
      { id: 'a', blockType: 'cover', title: 'Cover' },
      { id: 'b', blockName: 'Keep me', blockType: 'statement', title: 'Before', body: 'Old' },
      { id: 'c', blockType: 'cta', title: 'End' },
    ];

    const next = replaceSlideAt(slides, 1, {
      blockType: 'statement',
      title: 'After',
      body: 'New',
    });

    expect(next).toEqual([
      slides[0],
      {
        id: 'b',
        blockName: 'Keep me',
        blockType: 'statement',
        title: 'After',
        body: 'New',
      },
      slides[2],
    ]);
    expect(next).not.toBe(slides);
    expect(next[0]).toBe(slides[0]);
    expect(next[2]).toBe(slides[2]);
  });

  it('rejects an invalid slide index', () => {
    expect(() => replaceSlideAt([], 0, { blockType: 'cover', title: 'X' })).toThrow(
      'Invalid slide index',
    );
    expect(() => replaceSlideAt([{ blockType: 'cover' }], -1, {})).toThrow('Invalid slide index');
  });
});
