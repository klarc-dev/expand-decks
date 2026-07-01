import { describe, expect, it } from 'vitest';

import { computePageHashes, planDirtyPages, toRange } from '../pdfPageHash';

describe('pdfPageHash', () => {
  it('produces stable page hashes for identical page inputs', () => {
    const slides = [
      { blockType: 'cover', title: 'A' },
      { blockType: 'section', title: 'B' },
    ];

    expect(computePageHashes(slides, { globalSalt: 'theme-v1' })).toEqual(
      computePageHashes(slides, { globalSalt: 'theme-v1' }),
    );
  });

  it('dirties only changed pages when global render inputs are unchanged', () => {
    const before = computePageHashes(
      [
        { blockType: 'cover', title: 'A' },
        { blockType: 'section', title: 'B' },
      ],
      { globalSalt: 'theme-v1' },
    );
    const after = computePageHashes(
      [
        { blockType: 'cover', title: 'A' },
        { blockType: 'section', title: 'C' },
      ],
      { globalSalt: 'theme-v1' },
    );

    expect(planDirtyPages(before, after)).toMatchObject({ dirtyIndexes: [1], range: '2' });
  });

  it('dirties every page when global render inputs change', () => {
    const before = computePageHashes([{ title: 'A' }, { title: 'B' }], { globalSalt: 'theme-v1' });
    const after = computePageHashes([{ title: 'A' }, { title: 'B' }], { globalSalt: 'theme-v2' });

    expect(planDirtyPages(before, after)).toMatchObject({ dirtyIndexes: [0, 1], range: '1-2' });
  });

  it('compacts dirty pages into Slidev range syntax', () => {
    expect(toRange([2, 1, 4])).toBe('2-3,5');
  });
});
