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

process.env.NODE_ENV = 'development';
const { createServer: createSlidevServer, resolveOptions } = await import('@slidev/cli');
const options = await resolveOptions({ entry: resolve(distDir, '../slides.md') }, 'export');

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
    const relativePath =
      pathname === '/' || /^\/\d+$/.test(pathname) ? 'index.html' : pathname.replace(/^\/+/, '');
    const fileUrl = new URL(relativePath, `${pathToFileURL(`${distDir}/`).href}`);
    if (!fileUrl.pathname.startsWith(pathToFileURL(`${distDir}/`).pathname)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const filePath = fileUrl.pathname;
    await stat(filePath);
    const extension = relativePath.slice(relativePath.lastIndexOf('.'));
    response.writeHead(200, {
      'content-type': mimeTypes[extension] ?? 'application/octet-stream',
    });
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

// Range boxes expose actual text even when overflow:hidden/ellipsis keeps the
// outer scroll metrics deceptively within the canvas. Only text is inspected:
// cropped photos, SVG icons and pseudo-element decoration are not violations.
function inspectTextClipping({ print = false, slideIndex } = {}) {
  const slides = [
    ...document.querySelectorAll(
      slideIndex ? `[data-slidev-no="${slideIndex}"] .slidev-layout` : '.slidev-layout',
    ),
  ];
  const failures = [];
  for (const [index, slide] of slides.entries()) {
    const box = slide.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const scale = box.width / slide.offsetWidth;
    // Range boxes can extend about one device pixel past a card's client box
    // because Chromium rounds line boxes and glyph bounds independently. That
    // is not visible clipping. Keep a small 1.5px floor while still rejecting
    // text that loses a meaningful part of a line.
    const tolerance = Math.max(1.5, scale * 1.5);
    const seen = new Set();
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (
        !node.textContent.trim() ||
        !parent ||
        parent.closest('svg, [aria-hidden="true"], script, style')
      )
        continue;
      if (getComputedStyle(parent).visibility !== 'visible') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
      for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const card = ancestor.classList.contains('k-card');
        const clipX = ancestor === slide || card || /hidden|clip|auto|scroll/.test(style.overflowX);
        const clipY = ancestor === slide || card || /hidden|clip|auto|scroll/.test(style.overflowY);
        if (clipX || clipY) {
          const bounds = ancestor.getBoundingClientRect();
          const left = bounds.left + ancestor.clientLeft * scale;
          const top = bounds.top + ancestor.clientTop * scale;
          const right = left + ancestor.clientWidth * scale;
          const bottom = top + ancestor.clientHeight * scale;
          const clipped = rects.some(
            (rect) =>
              (clipX && (rect.left < left - tolerance || rect.right > right + tolerance)) ||
              (clipY && (rect.top < top - tolerance || rect.bottom > bottom + tolerance)),
          );
          if (clipped && !seen.has(parent)) {
            seen.add(parent);
            failures.push({
              slide: index + 1,
              selector: `${parent.tagName.toLowerCase()}.${[...parent.classList].join('.')}`,
              issue: 'text-clipping',
              text: node.textContent.trim().slice(0, 100),
              boundary: ancestor.className,
              mode: print ? 'print' : 'spa',
            });
          }
        }
        if (ancestor === slide) break;
      }
    }
  }
  return failures;
}

try {
  for (let index = 1; index <= slideCount; index += 1) {
    await page.goto(
      `http://127.0.0.1:${address.port}/${options.data.config.routerMode === 'hash' ? '#/' : ''}${index}`,
      {
        waitUntil: 'networkidle',
      },
    );
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
    // Neighbouring pages remain mounted during transitions. Inspect the
    // requested page after settling, not the previous cover under a new index.
    await page.waitForFunction((slideIndex) => {
      const slide = document.querySelector(`[data-slidev-no="${slideIndex}"] .slidev-layout`);
      const box = slide?.getBoundingClientRect();
      return box && box.width > 1 && box.height > 1;
    }, index);
    await page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((animation) => animation.finished.catch(() => {})),
      );
    });

    const result = await page.evaluate(
      ({ slideIndex, gap }) => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 1 && rect.height > 1;
        };
        const slide = document.querySelector(`[data-slidev-no="${slideIndex}"] .slidev-layout`);
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
          '.k-diagram-slide .mermaid',
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
    violations.push(
      ...(await page.evaluate(inspectTextClipping, { slideIndex: index })).map((failure) => ({
        ...failure,
        slide: index,
      })),
    );
  }

  // SPA builds and native exports use different Vite transforms. Inspect the
  // same export-mode print route as the CLI, not the built SPA's print route.
  // Error panels are rasterized in PDFs, so text extraction cannot guard this.
  if (violations.length === 0 && slideCount > 0) {
    const printServer = await createSlidevServer(options, {
      server: { host: '127.0.0.1', port: 0 },
      clearScreen: false,
    });
    try {
      await printServer.listen();
      const printAddress = printServer.httpServer.address();
      const base = `http://127.0.0.1:${printAddress.port}`;
      const url =
        options.data.config.routerMode === 'hash'
          ? `${base}/?print=true#print`
          : `${base}/print?print=true`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.locator('.print-slide-container').first().waitFor();
      for (const loading of await page.locator('.slidev-slide-loading').all())
        await loading.waitFor({ state: 'detached', timeout: 120_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      });
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(200);
      violations.push(...(await page.evaluate(inspectTextClipping, { print: true })));
      const failures = await page.evaluate((expected) => {
        const containers = [...document.querySelectorAll('.print-slide-container')];
        const failures = [];
        if (containers.length !== expected)
          failures.push(`Expected ${expected} print slides, found ${containers.length}`);
        for (const [index, container] of containers.entries()) {
          const text = container.textContent ?? '';
          if (
            /An error occurred on this slide|Failed to fetch this slide/.test(text) ||
            !container.querySelector('.slidev-layout')
          )
            failures.push(`Slide ${index + 1}: error fallback or missing slide layout`);
        }
        if (document.querySelector('vite-error-overlay'))
          failures.push('Vite transform error overlay');
        return failures;
      }, slideCount);
      if (failures.length)
        throw new Error(`Slidev native print validation failed: ${failures.join('; ')}`);
    } finally {
      await printServer.close();
    }
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
