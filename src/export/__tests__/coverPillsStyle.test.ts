import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { renderCover } from '../blocks/cover';
import { renderBlockPreview } from '../preview';
import { SLIDE_LIMITS } from '../../blocks/spec/limits';

it('wraps title pills on both surfaces with loaded IBM Plex Mono and shared preview/export markup', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.route('http://cover.test/fonts/**', (route) =>
      route.fulfill({
        contentType: 'font/woff2',
        body: readFileSync(
          `public/fonts/${new URL(route.request().url()).pathname.split('/').at(-1)}`,
        ),
      }),
    );
    await page.route('http://cover.test/', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
    );
    await page.goto('http://cover.test/');
    const css = readFileSync('src/export/style.css', 'utf8');
    for (const surface of ['light', 'dark']) {
      for (const texts of [
        [],
        ['Toulouse'],
        ['Toulouse', 'Lyon'],
        Array.from({ length: SLIDE_LIMITS.cover.pills.max }, () =>
          'W'.repeat(SLIDE_LIMITS.cover.pills.text.max),
        ),
      ]) {
        const block = {
          blockType: 'cover' as const,
          title: 'KLARC : Avocats et Conseils',
          pills: texts.map((text) => ({ text })),
          pillVariant: 'primary' as const,
        };
        const html = renderCover(block).replace(/^---\n[\s\S]*?\n---\n*/, '');
        expect(renderBlockPreview(block)!.html).toBe(html);
        await page.setContent(
          `<style>${css}</style><div class="slidev-layout cover ${surface === 'dark' ? 'k-dark' : ''}" style="position:relative;width:1280px;height:720px;--k-font-body:IBM Plex Sans;--k-font-heading:Newsreader">${html}</div>`,
        );
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => document.fonts.load('600 16px IBM Plex Mono'));
        const metrics = await page.locator('.k-eyebrow').evaluateAll((pills) =>
          pills.map((pill) => {
            const rect = pill.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(pill);
            return {
              contained: [...range.getClientRects()].every(
                (r) =>
                  r.left >= rect.left - 1 &&
                  r.right <= rect.right + 1 &&
                  r.top >= rect.top - 1 &&
                  r.bottom <= rect.bottom + 1,
              ),
              right: rect.right,
              bottom: rect.bottom,
              font: getComputedStyle(pill).fontFamily,
              color: getComputedStyle(pill).color,
              background: getComputedStyle(pill).backgroundColor,
            };
          }),
        );
        expect(metrics).toHaveLength(texts.length);
        for (const metric of metrics) {
          expect(metric.contained).toBe(true);
          expect(metric.right).toBeLessThanOrEqual(1280);
          expect(metric.bottom).toBeLessThanOrEqual(720);
          expect(metric.font).toContain('IBM Plex Mono');
          expect(metric.color).toBe('rgb(247, 246, 242)');
          expect(metric.background).toBe('rgb(3, 74, 78)');
        }
        expect(await page.evaluate(() => document.fonts.check('600 16px IBM Plex Mono'))).toBe(
          true,
        );
        if (texts.length === 2) await page.screenshot({ path: `/tmp/cover-pills-${surface}.png` });
      }
    }
  } finally {
    await browser.close();
  }
});
