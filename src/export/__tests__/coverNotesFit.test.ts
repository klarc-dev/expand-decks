import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';

it('keeps cover glyphs on the copy rail and wraps complete notes inside natural-height pills', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>
      .slidev-layout h1 { margin-left: -3px; }
      ${readFileSync('src/export/style.css', 'utf8')}
      </style><div class="slidev-layout cover" style="width:500px">
      <div class="k-cover-main"><div class="k-cover-copy"><h1 class="k-cover-title k-hero-big">KLARC : Avocats et Conseils</h1></div></div>
      <div class="k-def-footer" style="width:250px"><span class="k-def-item"><span class="k-def-index">1</span><span class="k-def-text">${'L’éligibilité dépend de l’examen des pièces. '.repeat(5)}</span></span></div></div>`);
    const result = await page.evaluate(() => {
      const title = document.querySelector('.k-cover-title')!;
      const note = document.querySelector('.k-def-text')!;
      const pill = document.querySelector('.k-def-item')!;
      const bounds = pill.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(note);
      return {
        titleMargin: getComputedStyle(title).marginLeft,
        overflow: getComputedStyle(note).overflow,
        ellipsis: getComputedStyle(note).textOverflow,
        height: bounds.height,
        lineHeight: parseFloat(getComputedStyle(note).lineHeight),
        contained: [...range.getClientRects()].every(
          (rect) =>
            rect.left >= bounds.left &&
            rect.right <= bounds.right &&
            rect.top >= bounds.top &&
            rect.bottom <= bounds.bottom,
        ),
      };
    });
    expect(result.titleMargin).toBe('0px');
    expect(result.overflow).toBe('visible');
    expect(result.ellipsis).not.toBe('ellipsis');
    expect(result.height).toBeGreaterThan(result.lineHeight);
    expect(result.contained).toBe(true);
  } finally {
    await browser.close();
  }
});
