import type { TableBlockData } from '../../blocks/spec/table';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TableBlockData };

export function renderTable(block: TableBlockData, ctx?: RenderCtx): string {
  const cols = block.columns ?? [];
  const rows = block.rows ?? [];
  const colCount = cols.length;

  const head = colCount
    ? `<thead>\n<tr>${cols.map((c) => `<th>${md(c.header)}</th>`).join('')}</tr>\n</thead>`
    : '';

  // Pad/truncate each row to the column count so a model cell-count mismatch
  // can never produce a ragged, broken table.
  const body = rows
    .map((r) => {
      const cells = (r.cells ?? []).map((c) => richTextToHTML(c.value));
      const aligned = colCount
        ? Array.from({ length: colCount }, (_, i) => cells[i] ?? '')
        : cells;
      return `<tr>${aligned.map((v) => `<td>${v}</td>`).join('')}</tr>`;
    })
    .join('\n');

  const table = `<table class="${K.table}">\n${head}\n<tbody>\n${body}\n</tbody>\n</table>`;
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(`${header}\n\n${table}`, { wFull: true });

  // Explicit block.surface wins over the resolved tone (KTD5).
  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
