import { validations, type ArrayFieldValidation } from 'payload';

type TableRow = { cells?: unknown[] | null };
type TableBlock = { columns?: unknown[] | null };

export interface TableAlignmentIssue {
  rowIndex: number;
  cellCount: number;
  columnCount: number;
}

export function findTableAlignmentIssue(
  columns: unknown[] | null | undefined,
  rows: TableRow[] | null | undefined,
): TableAlignmentIssue | undefined {
  const columnCount = Array.isArray(columns) ? columns.length : 0;
  if (!Array.isArray(rows) || columnCount === 0) return undefined;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const cellCount = Array.isArray(rows[rowIndex]?.cells) ? rows[rowIndex]!.cells!.length : 0;
    if (cellCount !== columnCount) return { rowIndex, cellCount, columnCount };
  }
}

export function tableAlignmentMessage(issue: TableAlignmentIssue): string {
  const { rowIndex, cellCount, columnCount } = issue;
  return `La ligne ${rowIndex + 1} contient ${cellCount} cellule${cellCount > 1 ? 's' : ''} ; ${columnCount} attendue${columnCount > 1 ? 's' : ''}.`;
}

/**
 * Payload field validation for table rows. The renderer remains defensive, but
 * authors get an explicit error before malformed row widths are saved.
 */
export const validateTableRows: ArrayFieldValidation = (value, options) => {
  const nativeResult = validations.array(value, options);
  if (nativeResult !== true) return nativeResult;

  const { blockData } = options;
  const issue = findTableAlignmentIssue(
    (blockData as TableBlock | undefined)?.columns,
    value as TableRow[] | undefined,
  );
  return issue ? tableAlignmentMessage(issue) : true;
};
