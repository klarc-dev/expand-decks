import { describe, expect, it } from 'vitest';

import { rowsToCollapse } from '../slidesFieldState';

type Row = { collapsed: boolean; id: string };

const row = (id: string, collapsed: boolean): Row => ({ collapsed, id });

describe('SlidesField accordion state', () => {
  it('collapses every open sibling when a collapsed slide is opened', () => {
    const first = row('first', false);
    const second = row('second', true);
    const third = row('third', false);

    expect(rowsToCollapse([first, second, third], second)).toEqual([first, third]);
  });

  it('does not change siblings when the active slide is being collapsed', () => {
    const first = row('first', false);
    const second = row('second', true);

    expect(rowsToCollapse([first, second], first)).toEqual([]);
  });

  it('ignores siblings that are already collapsed', () => {
    const first = row('first', true);
    const second = row('second', true);

    expect(rowsToCollapse([first, second], second)).toEqual([]);
  });
});
