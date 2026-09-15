import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';

it('keeps normal numbered copy at 15.2px, fits smaller rows fluidly, and never hides excess', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${readFileSync('src/export/style.css', 'utf8')}</style>
      <div class="k-card-scale-md k-grid-2 k-card-stack--grid k-card-stack--multirow" style="height:175px">
      <div class="k-card"><span class="k-num">01</span><h3>Preserved title</h3><p>Preserved description</p></div>
      <div class="k-card"><h3>Plain card</h3><p>Plain description</p></div></div>`);
    const sizes = () =>
      page
        .locator('.k-card p')
        .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize));
    expect(await sizes()).toEqual(['15.2px', '17.92px']);
    await page
      .locator('.k-card-stack--multirow')
      .evaluate((node) => ((node as HTMLElement).style.height = '140px'));
    const smaller = await sizes();
    expect(parseFloat(smaller[0]!)).toBeLessThan(15.2);
    expect(parseFloat(smaller[0]!)).toBeGreaterThanOrEqual(12.48);
    expect(smaller[1]).toBe('17.92px');
    // Equal-role siblings keep one scale even when their content lengths differ.
    await page
      .locator('.k-card')
      .last()
      .evaluate((node) => {
        node.insertAdjacentHTML('afterbegin', '<span class="k-num">02</span>');
        node.querySelector('p')!.textContent = 'A longer description. '.repeat(12);
      });
    const comparable = await sizes();
    expect(comparable[0]).toBe(comparable[1]);
    expect(
      await page
        .locator('.k-card')
        .first()
        .evaluate((node) => getComputedStyle(node).overflow),
    ).toBe('visible');
  } finally {
    await browser.close();
  }
});
