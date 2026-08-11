import { validations, type ArrayFieldValidation } from 'payload';

type TableRow = { cells?: unknown[] | null };
type TableBlock = { columns?: unknown[] | null };

/**
 * Payload field validation for table rows. The renderer remains defensive, but
 * authors get an explicit error before malformed row widths are saved.
 */
export const validateTableRows: ArrayFieldValidation = (value, options) => {
  const nativeResult = validations.array(value, options);
  if (nativeResult !== true) return nativeResult;

  const { blockData } = options;
  const columnCount = Array.isArray((blockData as TableBlock | undefined)?.columns)
    ? (blockData as TableBlock).columns!.length
    : 0;

  if (!Array.isArray(value) || columnCount === 0) return true;

  for (let index = 0; index < value.length; index++) {
    const row = value[index] as TableRow | null | undefined;
    const cellCount = Array.isArray(row?.cells) ? row.cells.length : 0;
    if (cellCount !== columnCount) {
      return `La ligne ${index + 1} contient ${cellCount} cellule${cellCount > 1 ? 's' : ''} ; ${columnCount} attendue${columnCount > 1 ? 's' : ''}.`;
    }
  }

  return true;
};
