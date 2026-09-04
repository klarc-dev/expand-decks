import { describe, expect, it } from 'vitest';

import { sourcePolicyForSelection } from '../adminSourcePolicy';

describe('admin source policy', () => {
  it('derives the policy from the selected sources', () => {
    expect(sourcePolicyForSelection([])).toEqual({ mode: 'none', sourceIds: [] });
    expect(sourcePolicyForSelection(['docs'])).toEqual({
      mode: 'exclusive',
      sourceIds: ['docs'],
    });
    expect(sourcePolicyForSelection(['docs', 'web'])).toEqual({
      mode: 'multiple',
      sourceIds: ['docs', 'web'],
    });
  });
});
