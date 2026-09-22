import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { expect, it } from 'vitest';

import { renderTable } from '../blocks/table';
import { renderTwoCols } from '../blocks/twoCols';

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

const css = readFileSync('src/export/style.css', 'utf8');

async function measure(rendered: string, selector: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<style>html,body{margin:0}.slidev-layout p{margin:0}${css}</style><div class="slidev-layout" style="width:1280px;height:720px">${rendered.replace(/^---[\s\S]*?---\s*/, '')}</div>`,
    );
    const metrics = await page.locator(selector).evaluate((node) => {
      const content = node.closest('.k-content')!.getBoundingClientRect();
      const main = node.closest('.k-content-main')!.getBoundingClientRect();
      const body = node.getBoundingClientRect();
      return {
        contentTop: content.top,
        contentBottom: content.bottom,
        mainTop: main.top,
        mainBottom: main.bottom,
        bodyTop: body.top,
        bodyBottom: body.bottom,
        topGap: body.top - main.top,
        bottomGap: main.bottom - body.bottom,
      };
    });
    return metrics;
  } finally {
    await browser.close();
  }
}

it('centers a short table in the available body row', async () => {
  const rendered = renderTable({
    blockType: 'table',
    title: 'Reference',
    columns: [{ header: 'Item' }, { header: 'Detail' }],
    rows: [{ cells: [{ value: lexical('One') }, { value: lexical('Detail') }] }],
  });
  const metrics = await measure(rendered, '.k-table-stage');
  expect(metrics.bodyTop).toBeGreaterThan(metrics.mainTop);
  expect(Math.abs(metrics.topGap - metrics.bottomGap)).toBeLessThanOrEqual(1);
});

it('centers both two-column sides in the available body row', async () => {
  const rendered = renderTwoCols({
    blockType: 'twoCols',
    title: 'Two columns',
    intro: lexical('A short introduction.'),
    rightCards: [{ title: 'Card', description: lexical('A short description.') }],
  });
  const metrics = await measure(rendered, '.k-split--body');
  expect(metrics.bodyTop).toBeGreaterThan(metrics.mainTop);
  expect(Math.abs(metrics.topGap - metrics.bottomGap)).toBeLessThanOrEqual(1);
});
