import type { TableBlockData } from '../../blocks/spec/table';
import { K } from '../classNames';
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

function statusPill(cellHtml: string): string {
  const t = cellHtml
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase();
  const match = STATUS_PATTERNS.find(([re]) => re.test(t));
  if (!match) return cellHtml; // prose cell — untouched
  const kind = match[1];
  const label = { ok: '✓', warn: '⚠', blocked: '✗' }[kind];
  return `<span class="${K.pill} ${K.pill}--${kind}">${label}</span>`;
}

export function renderTable(block: TableBlockData, ctx?: RenderCtx): string {
  const cols = block.columns ?? [];
  const rows = block.rows ?? [];
  const colCount = cols.length;
  const isMatrix = block.tableVariant === 'matrix';

  const head = colCount
    ? `<thead>\n<tr>${cols.map((c) => `<th>${md(c.header)}</th>`).join('')}</tr>\n</thead>`
    : '';

  // Pad/truncate each row to the column count so a model cell-count mismatch
  // can never produce a ragged, broken table. In matrix mode, ANY cell whose
  // whole text is a status token becomes a pill (self-classifying — not a
  // hardcoded column index), so status can live in any column.
  const body = rows
    .map((r) => {
      const cells = (r.cells ?? []).map((c) => richTextToHTML(c.value));
      const aligned = colCount ? Array.from({ length: colCount }, (_, i) => cells[i] ?? '') : cells;
      return `<tr>${aligned.map((v) => `<td>${isMatrix ? statusPill(v) : v}</td>`).join('')}</tr>`;
    })
    .join('\n');

  const tableCls = isMatrix ? `${K.table} k-table--matrix` : K.table;
  const table = `<table class="${tableCls}">\n${head}\n<tbody>\n${body}\n</tbody>\n</table>`;
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(`${header}\n\n${table}`, { wFull: true });

  // Explicit block.surface wins over the resolved tone (KTD5).
  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
