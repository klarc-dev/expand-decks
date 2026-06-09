import type { TableBlockData } from '../../blocks/spec/table';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TableBlockData };

/**
 * Local status-pill helper (U10/KTD7b — kept here, not promoted to utils, until
 * a 2nd consumer appears). Maps a status token in a matrix cell to a coloured
 * pill, replacing inline ✅/⚠️/❌ emoji. Recognises both the emoji and the
 * ok/warn/blocked / oui/non vocabulary; anything else passes through unchanged.
 */
function statusPill(cellHtml: string): string {
  const t = cellHtml.replace(/<[^>]+>/g, '').trim().toLowerCase();
  let kind: 'ok' | 'warn' | 'blocked' | null = null;
  if (/✅|✓|\bok\b|\boui\b|automatique/.test(t)) kind = 'ok';
  else if (/⚠️|⚠|\bwarn\b|attention|conditionnel/.test(t)) kind = 'warn';
  else if (/❌|✗|\bko\b|\bnon\b|blocked|aucune/.test(t)) kind = 'blocked';
  if (!kind) return cellHtml;
  const label = { ok: '✓', warn: '⚠', blocked: '✗' }[kind];
  return `<span class="k-pill k-pill--${kind}">${label}</span> ${cellHtml}`;
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
  // can never produce a ragged, broken table. In matrix mode, the 2nd column
  // (the status column by convention) renders status pills.
  const body = rows
    .map((r) => {
      const cells = (r.cells ?? []).map((c) => richTextToHTML(c.value));
      const aligned = colCount
        ? Array.from({ length: colCount }, (_, i) => cells[i] ?? '')
        : cells;
      return `<tr>${aligned
        .map((v, i) => `<td>${isMatrix && i === 1 ? statusPill(v) : v}</td>`)
        .join('')}</tr>`;
    })
    .join('\n');

  const tableCls = isMatrix ? `${K.table} k-table--matrix` : K.table;
  const table = `<table class="${tableCls}">\n${head}\n<tbody>\n${body}\n</tbody>\n</table>`;
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(`${header}\n\n${table}`, { wFull: true });

  // Explicit block.surface wins over the resolved tone (KTD5).
  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
