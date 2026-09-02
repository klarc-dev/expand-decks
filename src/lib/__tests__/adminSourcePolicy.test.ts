import { describe, expect, it } from 'vitest';

import { canStartWithSourcePolicy, sourceIdsForPolicy } from '../adminSourcePolicy';

describe('admin source policy', () => {
  it('sends no ids in none mode', () => {
    expect(sourceIdsForPolicy('none', ['docs'])).toEqual([]);
  });

  it('sends exactly one id in exclusive mode and requires it', () => {
    expect(canStartWithSourcePolicy('exclusive', [])).toBe(false);
    expect(canStartWithSourcePolicy('exclusive', ['docs'])).toBe(true);
    expect(sourceIdsForPolicy('exclusive', ['docs', 'web'])).toEqual(['docs']);
  });

  it('preserves the bounded selection in multiple mode', () => {
    expect(sourceIdsForPolicy('multiple', ['docs', 'web'])).toEqual(['docs', 'web']);
  });
});
