import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';

import { renderCardGrid } from '../blocks/cardGrid';

function lexical(text: string) {
  return {
    root: {
      type: 'root',
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
          textFormat: 0,
          children: [
            {
              type: 'text',
              text,
              detail: 0,
              format: 0,
              mode: 'normal' as const,
              style: '',
              version: 1,
            },
          ],
        },
      ],
    },
  } as never;
}

function slideBody(rendered: string): string {
  return rendered.replace(/^---[\s\S]*?---\s*/, '');
}

it('keeps numbered cards readable with equal padding and fluid fitting through the renderer', async () => {
  const rendered = renderCardGrid({
    blockType: 'cardGrid',
    title: 'Cards',
    columns: '2',
    cards: [
      { number: '01', title: 'Preserved title', description: lexical('Preserved description') },
      { title: 'Plain card', description: lexical('Plain description') },
      { number: '02', title: 'Another title', description: lexical('Another description') },
      { title: 'Another plain card', description: lexical('Another plain description') },
    ],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      `<style>${readFileSync('src/export/style.css', 'utf8')}</style>${slideBody(rendered)}`,
    );
    await page.locator('.k-card-stack').evaluate((node) => {
      (node as HTMLElement).style.height = '350px';
    });
    const cards = page.locator('.k-card');
    const numbered = cards.first();
    const plain = cards.nth(1);
    expect(await numbered.evaluate((node) => node.classList.contains('k-card--numbered'))).toBe(
      true,
    );
    expect(await plain.evaluate((node) => node.classList.contains('k-card--numbered'))).toBe(false);

    const metrics = await numbered.evaluate((node) => {
      const style = getComputedStyle(node);
      const heading = getComputedStyle(node.querySelector('h3')!);
      const body = getComputedStyle(node.querySelector('p')!);
      return {
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
        heading: heading.fontSize,
        body: body.fontSize,
        overflow: style.overflow,
      };
    });
    expect(new Set(metrics.padding).size).toBe(1);
    expect(metrics.padding[0]).toBe('14.4px');
    expect(metrics.heading).toBe('20px');
    expect(metrics.body).toBe('15.2px');
    expect(metrics.overflow).toBe('visible');
    expect(await plain.locator('p').evaluate((node) => getComputedStyle(node).fontSize)).toBe(
      '17.92px',
    );

    await numbered.evaluate((node) => {
      (node as HTMLElement).style.height = '100px';
    });
    const smaller = await numbered
      .locator('p')
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(smaller).toBeLessThan(15.2);
    expect(smaller).toBeGreaterThanOrEqual(12.48);
  } finally {
    await browser.close();
  }
});
