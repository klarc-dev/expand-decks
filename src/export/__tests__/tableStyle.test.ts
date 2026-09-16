import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { expect, it } from 'vitest';
import { renderTable } from '../blocks/table';
import { renderBlockPreview } from '../preview';
import { resetDefs } from '../utils';

const lexical = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text,
            format: 0,
            detail: 0,
            mode: 'normal' as const,
            style: '',
          },
        ],
      },
    ],
  },
});

it('renders table definitions only once', () => {
  resetDefs();
  const html = renderTable({
    blockType: 'table',
    title: 'Evidence',
    columns: [{ header: 'Item' }, { header: 'Detail' }],
    rows: [
      {
        cells: [{ value: lexical('One') }, { value: lexical('Detail {{def:Canonical source}}') }],
      },
    ],
  });
  expect(html.match(/class="k-def-item"/g)).toHaveLength(1);
  expect(html).toContain('<sup class="k-def-ref">1</sup>');
});

it('fits wide short tables, boundary row counts and status matrices with preview parity', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const css = readFileSync('src/export/style.css', 'utf8');
    for (const count of [3, 4, 5]) {
      for (const matrix of [false, true]) {
        const block = {
          blockType: 'table' as const,
          title: 'A readable reference',
          tableVariant: matrix ? ('matrix' as const) : ('reference' as const),
          columns: [{ header: 'Item' }, { header: 'Detail' }],
          rows: Array.from({ length: count }, () => ({
            cells: [
              { value: lexical('A decision') },
              {
                value: lexical(
                  matrix
                    ? 'ok'
                    : 'Document the decision and its contractual implications. '
                        .repeat(8)
                        .slice(0, 420),
                ),
              },
            ],
          })),
        };
        const preview = renderBlockPreview(block, { surface: 'light' })!;
        expect(preview.html).toBe(
          renderTable(block, { surface: 'light' }).replace(/^---\n[\s\S]*?\n---\n*/, ''),
        );
        await page.setContent(
          `<style>html,body{margin:0}.slidev-layout p{margin:0}${css}</style><div class="slidev-layout" style="width:1280px;height:720px">${preview.html}</div>`,
        );
        const geometry = await page.locator('.k-table').evaluate((table) => {
          const bounds = table.getBoundingClientRect();
          const main = table.closest('.k-content-main')!.getBoundingClientRect();
          const walker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT);
          let escaped = 0;
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects())
              if (rect.bottom > main.bottom + 1 || rect.right > main.right + 1) escaped++;
          }
          return {
            bottom: bounds.bottom,
            limit: main.bottom,
            escaped,
            font: parseFloat(getComputedStyle(table).fontSize),
            headerVerticalAlign: getComputedStyle(table.querySelector('th')!).verticalAlign,
          };
        });
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.limit + 1);
        expect(geometry.escaped).toBe(0);
        expect(geometry.font).toBeGreaterThanOrEqual(12.16);
        expect(geometry.headerVerticalAlign).toBe('middle');
        if (matrix) expect(await page.locator('.k-pill--ok').count()).toBe(count);
      }
    }
  } finally {
    await browser.close();
  }
});
