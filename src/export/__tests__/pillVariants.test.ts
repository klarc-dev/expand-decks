import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { PILL_VARIANTS, PILL_VARIANT_OPTIONS } from '../../blocks/spec/pillVariants';
import { coverSpec, coverRenderSchema } from '../../blocks/spec/cover';
import { aiSchemaOf, renderSchemaOf } from '../../blocks/spec/dsl';
import { emitPayloadBlock } from '../../blocks/spec/emit/emitPayloadBlock';
import { SLIDE_LIMITS } from '../../blocks/spec/limits';
import { eyebrow, eyebrowGroup, slideHeader, heroFrame } from '../utils';
import { renderCover } from '../blocks/cover';
import { buildThemeCss } from '../theme';

// Verified against the saved Klarc organisation; not the stylesheet's older defaults.
const brand = {
  primary: '#02585C',
  secondary: '#F5A3B0',
  ink: '#0F2A2B',
  paper: '#FAFBFB',
};
const base = {
  blockType: 'cover' as const,
  title: 'Klarc : Avocats et Conseils en Propriété Industrielle',
  pills: [{ text: 'Toulouse' }, { text: 'Lyon' }],
};

describe('semantic pill variants', () => {
  it('projects the same bounded palette to authoring, AI and render contracts', () => {
    expect(PILL_VARIANT_OPTIONS.map(({ value }) => value)).toEqual([...PILL_VARIANTS]);
    expect(
      emitPayloadBlock(coverSpec).fields.find((f) => 'name' in f && f.name === 'pillVariant'),
    ).toMatchObject({
      type: 'select',
      options: PILL_VARIANT_OPTIONS,
      defaultValue: 'default',
    });
    for (const schema of [coverRenderSchema, renderSchemaOf(coverSpec), aiSchemaOf(coverSpec)]) {
      for (const pillVariant of PILL_VARIANTS)
        expect(schema.safeParse({ ...base, pillVariant }).success).toBe(true);
      expect(schema.safeParse({ ...base, pillVariant: 'red' }).success).toBe(false);
      expect(schema.safeParse(base).success).toBe(true);
    }
  });
  it('preserves default markup and composes explicit props on both primitives and legacy covers', () => {
    expect(eyebrow('Text')).toBe('\n<div class="k-eyebrow">Text</div>');
    expect(eyebrow('Text', '', { variant: 'default' })).toBe(eyebrow('Text'));
    for (const variant of PILL_VARIANTS.filter((v) => v !== 'default')) {
      expect(eyebrow('Text', '', { variant, extraClass: 'k-eyebrow-dark' })).not.toContain(
        'k-eyebrow-dark',
      );
      expect(slideHeader({ title: 'Title', eyebrow: 'Text', pillVariant: variant })).toContain(
        `k-eyebrow--${variant}`,
      );
      expect(
        heroFrame({
          title: 'Title',
          eyebrow: 'Text',
          pillVariant: variant,
          scale: 'hero',
          align: 'center',
        }),
      ).toContain(`k-eyebrow--${variant}`);
      expect(eyebrow('<Text>', '', { variant })).toContain(`k-eyebrow--${variant}">&lt;Text&gt;`);
      expect(
        eyebrowGroup(['One', 'Two'], '', { variant }).match(
          new RegExp(`k-eyebrow--${variant}`, 'g'),
        ),
      ).toHaveLength(2);
      expect(renderCover({ ...base, pillVariant: variant })).toContain(`k-eyebrow--${variant}`);
      expect(
        renderCover({
          ...base,
          pills: [],
          eyebrow: 'Legacy',
          pillVariant: variant,
        }),
      ).toContain(`k-eyebrow--${variant}">Legacy`);
    }
  });
  it('renders every role in light/dark with real org colors, readable contrast and unclipped max-length labels', async () => {
    const browser = await chromium.launch();
    const report: unknown[] = [];
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      await page.route('http://pills.test/fonts/**', (route) =>
        route.fulfill({
          contentType: 'font/ttf',
          body: readFileSync(
            `public/fonts/${new URL(route.request().url()).pathname.split('/').at(-1)}`,
          ),
        }),
      );
      await page.route('http://pills.test/', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
      );
      await page.goto('http://pills.test/');
      const css = readFileSync('src/export/style.css', 'utf8') + buildThemeCss(brand);
      for (const surface of ['light', 'dark'])
        for (const variant of PILL_VARIANTS)
          for (const max of [false, true]) {
            const block = {
              ...base,
              pillVariant: variant,
              ...(max
                ? {
                    pills: Array.from({ length: SLIDE_LIMITS.cover.pills.max }, () => ({
                      text: 'W'.repeat(SLIDE_LIMITS.cover.pills.text.max),
                    })),
                  }
                : {}),
            };
            const html = renderCover(block).replace(/^---\n[\s\S]*?\n---\n*/, '');
            await page.setContent(
              `<style>${css}</style><div class="slidev-layout cover ${surface === 'dark' ? 'k-dark' : ''}" style="position:relative;width:1280px;height:720px;--k-font-body:Gilroy;--k-font-heading:Gilroy">${html}</div>`,
            );
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(() => document.fonts.load('600 16px Gilroy'));
            const metrics = await page.locator('.k-eyebrow').evaluateAll((pills) =>
              pills.map((pill) => {
                const style = getComputedStyle(pill),
                  rect = pill.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(pill);
                const rgb = (s: string) => {
                  const c = document.createElement('canvas').getContext('2d')!;
                  c.fillStyle = s;
                  c.fillRect(0, 0, 1, 1);
                  return [...c.getImageData(0, 0, 1, 1).data];
                };
                const fg = rgb(style.color),
                  bg = rgb(style.backgroundColor);
                const surface = rgb(
                  getComputedStyle(pill.closest('.slidev-layout')!).backgroundColor,
                );
                const alpha = bg[3]! / 255;
                const opaqueBg = bg
                  .slice(0, 3)
                  .map((v, i) => v * alpha + surface[i]! * (1 - alpha));
                const lum = (c: number[]) =>
                  c
                    .slice(0, 3)
                    .map((v) => v / 255)
                    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
                    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0);
                const a = lum(fg),
                  b = lum(opaqueBg);
                return {
                  contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                  bg: bg.slice(0, 3),
                  dot: getComputedStyle(pill, '::before').backgroundColor,
                  fg: style.color,
                  font: style.fontFamily,
                  fits:
                    [...range.getClientRects()].every(
                      (r) =>
                        r.left >= rect.left - 1 &&
                        r.right <= rect.right + 1 &&
                        r.top >= rect.top - 1 &&
                        r.bottom <= rect.bottom + 1,
                    ) &&
                    rect.right <= 1280 &&
                    rect.bottom <= 720,
                };
              }),
            );
            for (const m of metrics) {
              expect(m.fits).toBe(true);
              expect(m.contrast).toBeGreaterThanOrEqual(4.5);
              expect(m.dot).toBe(m.fg);
              expect(m.font).toBe('Gilroy');
              if (variant === 'secondary') expect(m.bg).toEqual([245, 163, 176]);
            }
            report.push({ surface, variant, max, metrics });
            if (!max)
              await page.screenshot({
                path: `/tmp/pill-variant-${surface}-${variant}.png`,
              });
          }
      writeFileSync('/tmp/pill-variant-verification.json', JSON.stringify(report, null, 2));
    } finally {
      await browser.close();
    }
  }, 60000);
});
