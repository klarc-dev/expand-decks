export type CollapsibleRow = { collapsed: boolean };

export function rowsToCollapse<T extends CollapsibleRow>(rows: readonly T[], openingRow: T): T[] {
  if (!openingRow.collapsed) return [];
  return rows.filter((row) => row !== openingRow && !row.collapsed);
}
