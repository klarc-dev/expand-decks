import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

import { buildHeadmatter, buildThemeCss } from '../theme';

const brand = {
  primary: '#123456',
  secondary: '#abcdef',
  ink: '#111111',
  paper: '#ffffff',
  headingFont: 'Newsreader',
  bodyFont: 'IBM Plex Sans',
};

describe('buildThemeCss', () => {
  it('returns empty string for null brand (base CSS stays authoritative)', () => {
    expect(buildThemeCss(null)).toBe('');
    expect(buildThemeCss(undefined)).toBe('');
  });

  it('returns empty string when any color is not a valid hex', () => {
    expect(buildThemeCss({ ...brand, primary: 'teal' })).toBe('');
    expect(buildThemeCss({ ...brand, paper: '#fff' })).toBe('');
  });

  it('emits a :root block mapping colors and font-family vars onto token roots', () => {
    const css = buildThemeCss(brand);
    expect(css).toContain(':root {');
    expect(css).toContain('--k-teal: #123456;');
    expect(css).toContain('--k-rose: #abcdef;');
    expect(css).toContain('--k-ink: #111111;');
    expect(css).toContain('--k-paper: #ffffff;');
    expect(css).toContain('--k-font-heading: "Newsreader", ui-sans-serif, system-ui, sans-serif;');
    expect(css).toContain('--k-font-body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;');
  });

  it('derives every shade from the source colors via color-mix (no stored shades)', () => {
    const css = buildThemeCss(brand);
    expect(css).toContain('--k-teal-700: color-mix(in srgb, #123456 75%, black);');
    expect(css).toContain('--k-teal-50: color-mix(in srgb, #123456 8%, white);');
    expect(css).toContain('--k-teal-300: color-mix(in srgb, #123456 45%, white);');
    expect(css).toContain('--k-rose-soft: color-mix(in srgb, #abcdef 30%, white);');
    expect(css).toContain('--k-ink-soft: color-mix(in srgb, #111111 70%, white);');
    expect(css).toContain('--k-line: color-mix(in srgb, #123456 12%, transparent);');
  });

  it('keeps bright-primary cover text and white logo legible without changing dark brands', async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const baseCss = readFileSync('src/export/style.css', 'utf8');
      for (const [primary, expectedForeground, expectedFilter] of [
        ['#e68a00', 'rgb(40, 35, 30)', 'brightness(0)'],
        ['#02585c', 'rgb(255, 255, 255)', 'none'],
      ]) {
        const theme = buildThemeCss({
          ...brand,
          primary,
          ink: '#28231e',
          paper: '#FAFBFB',
        });
        await page.setContent(`<style>${baseCss}\n${theme}</style>
          <div class="slidev-page"><div class="slidev-layout k-dark" style="width:1280px;height:720px">
          <div class="k-cover"><h1 class="k-cover-title">Title</h1><p class="k-hero-sub">Subtitle</p>
          <div class="k-eyebrow k-eyebrow--primary">Label</div></div></div>
          <img class="k-slide-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" />
          </div>`);
        const measured = await page.evaluate(() => {
          const background = getComputedStyle(document.querySelector('.k-dark')!).backgroundColor;
          const color = (selector: string) =>
            getComputedStyle(document.querySelector(selector)!).color;
          const contrast = (a: string, b: string) => {
            const luminance = (rgb: string) => {
              const ctx = document.createElement('canvas').getContext('2d')!;
              ctx.fillStyle = rgb;
              ctx.fillRect(0, 0, 1, 1);
              const channels = [...ctx.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((v) => v / 255);
              return channels
                .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
                .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
            };
            const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
            return (light! + 0.05) / (dark! + 0.05);
          };
          return {
            title: color('h1'),
            subtitle: color('.k-hero-sub'),
            logoFilter: getComputedStyle(document.querySelector('.k-slide-logo')!).filter,
            ratios: ['h1', '.k-hero-sub', '.k-eyebrow'].map((selector) =>
              contrast(
                color(selector),
                selector === '.k-eyebrow'
                  ? getComputedStyle(document.querySelector(selector)!).backgroundColor
                  : background,
              ),
            ),
          };
        });
        expect(measured.title).toBe(expectedForeground);
        if (expectedForeground !== 'rgb(255, 255, 255)') {
          expect(measured.subtitle).toBe(expectedForeground);
        }
        expect(measured.logoFilter).toBe(expectedFilter);
        for (const ratio of measured.ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      await browser.close();
    }
  }, 30000);

  it('does not flatten an opaque JPEG logo to a black square on a bright primary', async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(`<style>${readFileSync('src/export/style.css', 'utf8')}
        ${buildThemeCss({ ...brand, primary: '#e68a00', ink: '#28231e' })}</style>
        <div class="slidev-page"><div class="slidev-layout k-dark"><div class="k-cta-title">Next step</div></div>
        <img class="k-slide-logo" src="/media/logo.jpg?v=1" /></div>`);
      expect(
        await page.locator('.k-slide-logo').evaluate((el) => getComputedStyle(el).filter),
      ).toBe('none');
      expect(await page.locator('.k-cta-title').evaluate((el) => getComputedStyle(el).color)).toBe(
        'rgb(40, 35, 30)',
      );
    } finally {
      await browser.close();
    }
  });
});

describe('buildHeadmatter', () => {
  const base = `theme: default
fonts:
  sans: Roboto
  provider: google
  local: Gilroy
htmlAttrs:
  lang: fr`;

  it('rewrites fonts and lang for the org/presentation', () => {
    const out = buildHeadmatter(
      base,
      { ...brand, headingFont: 'Newsreader', bodyFont: 'IBM Plex Sans' },
      'en',
    );
    expect(out).toContain('sans: Roboto');
    expect(out).toContain('local: Gilroy');
    expect(out).toContain('lang: en');
  });

  it('leaves base untouched when brand and language are absent', () => {
    expect(buildHeadmatter(base, null)).toBe(base);
  });
});
