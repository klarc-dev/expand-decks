import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { expect, it } from 'vitest';
import { renderCta } from '../blocks/cta';
import { renderBlockPreview } from '../preview';

it('shares action geometry, tone and keyboard focus across preview and export markup', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const css = readFileSync('src/export/style.css', 'utf8');
    const block = {
      blockType: 'cta' as const,
      title: 'Discuss your next step',
      primaryAction: 'Book a meeting',
      primaryActionUrl: 'https://example.com/book',
      secondaryAction: 'Visit our website',
      secondaryActionUrl: 'https://example.com',
    };
    for (const surface of ['light', 'dark'] as const) {
      const preview = renderBlockPreview(block, { surface })!;
      const exported = renderCta(block, { surface }).replace(/^---\n[\s\S]*?\n---\n*/, '');
      expect(preview.html).toBe(exported);
      const results = [];
      for (const html of [preview.html, exported]) {
        await page.setContent(
          `<style>${css}</style><div class="slidev-layout ${surface === 'dark' ? 'k-dark' : ''}" style="width:1280px;height:720px">${html}</div>`,
        );
        const metrics = await page.locator('.k-cta-actions a').evaluateAll((links) =>
          links.map((link) => {
            const style = getComputedStyle(link);
            return {
              height: link.getBoundingClientRect().height,
              color: style.color,
              background: style.backgroundColor,
              letterSpacing: style.letterSpacing,
            };
          }),
        );
        expect(metrics).toHaveLength(1);
        expect(await page.locator('.k-cta-actions a').getAttribute('href')).toBe(
          block.primaryActionUrl,
        );
        expect(await page.locator('.k-cta-actions').textContent()).not.toContain(
          block.secondaryAction,
        );
        expect(metrics[0]!.height).toBeGreaterThanOrEqual(44);
        expect(metrics[0]!.color).toBe(
          surface === 'dark' ? 'rgb(2, 88, 92)' : 'rgb(255, 255, 255)',
        );
        await page.keyboard.press('Tab');
        expect(
          await page.locator('.k-btn').evaluate((link) => getComputedStyle(link).outlineStyle),
        ).toBe('solid');
        results.push(metrics);
      }
      expect(results[0]).toEqual(results[1]);
    }
  } finally {
    await browser.close();
  }
});
