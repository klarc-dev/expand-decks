import { describe, expect, it } from 'vitest';

import { validateTableRows } from '../tableValidation';

const options = (columnCount: number) =>
  ({
    blockData: { columns: Array.from({ length: columnCount }, () => ({})) },
    req: { t: (key: string) => key },
  }) as unknown as Parameters<typeof validateTableRows>[1];

describe('validateTableRows', () => {
  it('accepts one cell per column', () => {
    expect(validateTableRows([{ cells: [{}, {}, {}] }], options(3))).toBe(true);
  });

  it('identifies the first malformed row', () => {
    expect(validateTableRows([{ cells: [{}, {}] }, { cells: [{}] }], options(2))).toBe(
      'La ligne 2 contient 1 cellule ; 2 attendues.',
    );
  });

  it('lets native required/minRows validation handle absent rows', () => {
    expect(validateTableRows(undefined, options(3))).toBe(true);
  });
});
