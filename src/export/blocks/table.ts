import type { TableBlockData } from '../../blocks/spec/table';
import { K } from '../classNames';
import { densityClass, densityFromScore, totalVisibleText, visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TableBlockData };

/**
 * Local status-pill helper (U10/KTD7b — kept here, not promoted to utils, until
 * a 2nd consumer appears). When a matrix cell's ENTIRE text is a status token
 * (emoji ✅/⚠️/❌, ASCII ✓/⚠/✗, or the ok/warn/blocked vocabulary), replace it
 * with a coloured pill. Any cell that is prose — even prose containing "non" or
 * "ok" mid-sentence — is left untouched (the match is whole-cell, not substring,
 * so "non-applicable" or "personne non organisée" never get a pill).
 */
const STATUS_PATTERNS: Array<[RegExp, 'ok' | 'warn' | 'blocked']> = [
  [/^(✅|✓|ok|oui|automatique)$/, 'ok'],
  [/^(⚠️|⚠|warn|attention|conditionnel|conditionnelle)$/, 'warn'],
  [/^(❌|✗|ko|non|blocked|aucune)$/, 'blocked'],
];

function statusKind(cellHtml: string): 'ok' | 'warn' | 'blocked' | null {
  const t = cellHtml
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase();
  const match = STATUS_PATTERNS.find(([re]) => re.test(t));
  return match?.[1] ?? null;
}

function statusPill(kind: 'ok' | 'warn' | 'blocked'): string {
  const label = { ok: '✓', warn: '⚠', blocked: '✗' }[kind];
  return `<span class="${K.pill} ${K.pill}--${kind}">${label}</span>`;
}

export function renderTable(block: TableBlockData, ctx?: RenderCtx): string {
  const cols = block.columns ?? [];
  const rows = block.rows ?? [];
  const colCount = cols.length;
  const isMatrix = block.tableVariant === 'matrix';
  const cellHtml = rows.flatMap((row) =>
    (row.cells ?? []).map((cell) => richTextToHTML(cell.value)),
  );
  const textVolume = totalVisibleText([
    block.title,
    ...cols.map((column) => column.header),
    ...cellHtml,
  ]);
  const longestCell = Math.max(0, ...cellHtml.map((cell) => visibleText(cell).length));
  const density = densityFromScore(
    textVolume + rows.length * 34 + colCount * 54 + longestCell * 2.6,
    { compact: 700, dense: 1120 },
  );
  const fitted = density !== 'comfortable';
  const renderedRows = rows.map((row) =>
    (row.cells ?? []).map((cell) => richTextToHTML(cell.value)),
  );
  const statusColumns = new Set(
    isMatrix
      ? Array.from({ length: colCount }, (_, columnIndex) => columnIndex).filter((columnIndex) => {
          const populated = renderedRows
            .map((row) => row[columnIndex])
            .filter((cell) => visibleText(cell));
          return populated.length > 0 && populated.every((cell) => statusKind(cell) !== null);
        })
      : [],
  );

  const head = colCount
    ? `<thead>\n<tr>${cols.map((c) => `<th>${md(c.header)}</th>`).join('')}</tr>\n</thead>`
    : '';

  // Row/column parity is enforced by the canonical render schema before this
  // renderer is called. Matrix status cells remain self-classifying, so status
  // can live in any column without a hardcoded index.
  const body = renderedRows
    .map((row) => {
      return `<tr>${row
        .map((cell, columnIndex) => {
          const kind = isMatrix ? statusKind(cell) : null;
          const classAttr = kind ? ' class="k-table-cell--status"' : '';
          return `<td${classAttr}>${kind ? statusPill(kind) : cell}</td>`;
        })
        .join('')}</tr>`;
    })
    .join('\n');

  const tableCls = [
    K.table,
    isMatrix ? 'k-table--matrix' : '',
    fitted ? 'k-table--fit' : '',
    `k-table--cols-${Math.min(Math.max(colCount, 2), 5)}`,
    statusColumns.size ? 'k-table--has-status' : '',
    densityClass(density),
  ]
    .filter(Boolean)
    .join(' ');
  const columns = colCount
    ? `<colgroup>${Array.from({ length: colCount }, (_, index) => `<col${statusColumns.has(index) ? ' class="k-table-col--status"' : ''}>`).join('')}</colgroup>\n`
    : '';
  const table = `<div class="k-table-stage"><table class="${tableCls}">\n${columns}${head}\n<tbody>\n${body}\n</tbody>\n</table></div>`;
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    size: 'md',
    density,
  });
  const bodyHtml = contentFrame(table, {
    header,
    wFull: true,
    crowded: fitted,
    density,
    mainAlign: 'start',
  });

  return wrapSlide({ classAttr: surfaceClass(ctx?.surface ?? 'light'), body: bodyHtml });
}
