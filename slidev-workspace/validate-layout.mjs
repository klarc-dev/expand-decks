import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from 'playwright-chromium';

const distDir = resolve(process.argv[2] ?? '');
const slideCount = Number(process.argv[3] ?? 0);
const safetyGap = Number(process.argv[4] ?? 8);

if (!distDir || !Number.isInteger(slideCount) || slideCount < 0) {
  throw new Error('Usage: node validate-layout.mjs <dist-dir> <slide-count> [safety-gap-px]');
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const fileUrl = new URL(relativePath, `${pathToFileURL(`${distDir}/`).href}`);
    if (!fileUrl.pathname.startsWith(pathToFileURL(`${distDir}/`).pathname)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const filePath = fileUrl.pathname;
    await stat(filePath);
    const extension = relativePath.slice(relativePath.lastIndexOf('.'));
    response.writeHead(200, { 'content-type': mimeTypes[extension] ?? 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500).end(error instanceof Error ? error.message : String(error));
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
if (!address || typeof address === 'string')
  throw new Error('Layout validator server failed to start');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const violations = [];

try {
  for (let index = 1; index <= slideCount; index += 1) {
    await page.goto(`http://127.0.0.1:${address.port}/#/${index}`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise((resolveImage) => {
                image.addEventListener('load', resolveImage, { once: true });
                image.addEventListener('error', resolveImage, { once: true });
              }),
          ),
      );
    });
    await page.waitForTimeout(200);

    const result = await page.evaluate(
      ({ slideIndex, gap }) => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 1 && rect.height > 1;
        };
        const slide = [...document.querySelectorAll('.slidev-layout')].find(visible);
        if (!slide) return [{ slide: slideIndex, selector: '.slidev-layout', issue: 'missing' }];

        const failures = [];
        const footer = [...document.querySelectorAll('.k-slide-footer')].find(visible);
        const footerRect = footer?.getBoundingClientRect();
        const frame = slide.querySelector(
          '.k-content, .k-hero, .k-center-hero, .k-cover, .k-diagram-slide, .k-markdown-slide',
        );
        const scale = frame ? frame.getBoundingClientRect().width / frame.clientWidth : 1;
        const tolerance = Math.max(1, scale);

        const overflowSelectors = [
          '.k-content-main',
          '.k-hero-main',
          '.k-center-hero-main',
          '.k-cover-main',
          '.k-table-stage',
        ];
        for (const selector of overflowSelectors) {
          for (const element of slide.querySelectorAll(selector)) {
            if (!visible(element)) continue;
            const vertical = element.scrollHeight - element.clientHeight;
            const horizontal = element.scrollWidth - element.clientWidth;
            if (vertical > 1 || horizontal > 1) {
              failures.push({
                slide: slideIndex,
                selector,
                issue: 'overflow',
                verticalPx: Math.round(vertical),
                horizontalPx: Math.round(horizontal),
              });
            }
          }
        }

        const substantiveSelectors = [
          '.k-table',
          '.k-card-stack',
          '.k-split',
          '.k-agenda',
          '.k-timeline',
          '.k-diagram-slide .mermaid',
          '.k-hero-main',
          '.k-center-hero-main',
          '.k-cover-main',
        ];
        for (const selector of substantiveSelectors) {
          for (const element of slide.querySelectorAll(selector)) {
            if (!visible(element)) continue;
            const rect = element.getBoundingClientRect();
            if (footerRect && rect.bottom > footerRect.top - gap * scale + tolerance) {
              failures.push({
                slide: slideIndex,
                selector,
                issue: 'footer-intersection',
                bottomPx: Math.round(rect.bottom),
                footerTopPx: Math.round(footerRect.top),
              });
            }
          }
        }

        return failures;
      },
      { slideIndex: index, gap: safetyGap },
    );
    violations.push(...result);
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

if (violations.length > 0) {
  console.error(JSON.stringify({ error: 'Slide layout validation failed', violations }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ valid: true, slideCount }));
}
