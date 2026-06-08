import type { TableBlockData } from '../../blocks/spec/table';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { eyebrow as renderEyebrow, md, surfaceClass, wrapSlide } from '../utils';

export type { TableBlockData };

export function renderTable(block: TableBlockData): string {
  const cols = block.columns ?? [];
  const rows = block.rows ?? [];
  const colCount = cols.length;

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-6', { indent: '    ' });

  const head = colCount
    ? `<thead>\n<tr>${cols.map((c) => `<th>${md(c.header)}</th>`).join('')}</tr>\n</thead>`
    : '';

  // Pad/truncate each row to the column count so a model cell-count mismatch
  // can never produce a ragged, broken table. cells are rich text; richTextToHTML
  // returns '' for a missing (padded) cell.
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

  const bodyHtml = `<div class="px-14 pt-24 w-full">

<div class="mb-8">${eyebrow}
  <h2 class="text-4xl">${md(block.title)}</h2>
</div>

${table}

</div>`;

  return wrapSlide({ classAttr: surfaceClass(block.surface), body: bodyHtml });
}
