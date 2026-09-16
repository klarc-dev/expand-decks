import { execFile as execFileCb } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { expect, it } from 'vitest';

import { buildSlidesMd } from '../buildSlidesMd';
import { renderBlockPreview } from '../preview';
import { buildPreviewRenderContext } from '../renderContext';
import { buildThemeCss } from '../theme';
import { resetDefs, seedFootnotes } from '../utils';
import { setVarDoc } from '../vars';

const execFile = promisify(execFileCb);
const workspace = resolve('slidev-workspace');
const slidev = join(workspace, 'node_modules/.bin/slidev');
const brand = {
  primary: '#02585C',
  secondary: '#F5A3B0',
  ink: '#0F2A2B',
  paper: '#FAFBFB',
  headingFont: 'Newsreader',
  bodyFont: 'IBM Plex Sans',
};
const lexical = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    format: '' as const,
    indent: 0,
    direction: null,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '' as const,
        indent: 0,
        direction: null,
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
});

async function staticServer(root: string) {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const relative =
      pathname === '/' || /^\/\d+$/.test(pathname) ? 'index.html' : pathname.slice(1);
    const path = join(root, relative);
    const types: Record<string, string> = {
      '.css': 'text/css',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };
    try {
      response.writeHead(200, {
        'content-type': types[extname(path)] ?? 'application/octet-stream',
      });
      createReadStream(path).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static server did not start');
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

it('keeps a real-content candidate preview visually aligned with native Slidev output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'candidate-preview-parity-'));
  const browser = await chromium.launch();
  const mediaName = 'candidate-parity.svg';
  const mediaSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#F5A3B0"/><circle cx="400" cy="400" r="230" fill="#02585C"/><path d="M260 430h280" stroke="#FAFBFB" stroke-width="34"/></svg>`;
  const slide = {
    blockType: 'section' as const,
    number: '02',
    title: '{org.name} transforme les preuves en décisions',
    subtitle: lexical(
      'Une composition réelle, avec média et citation {{def:Rapport annuel 2026}}.',
    ),
    image: { url: `/media/${mediaName}` },
    imagePosition: 'right' as const,
    footnotes: [{ text: 'Rapport annuel 2026' }],
  };
  const vars = { org: { name: 'Klarc' }, organisation: { name: 'Klarc' } };
  let server: ReturnType<typeof createServer> | undefined;
  try {
    await symlink(join(workspace, 'node_modules'), join(dir, 'node_modules'), 'dir');
    await mkdir(join(dir, 'public', 'media'), { recursive: true });
    await mkdir(join(dir, 'public', 'fonts'), { recursive: true });
    await writeFile(join(dir, 'public', 'media', mediaName), mediaSvg);
    await cp(resolve('public/fonts'), join(dir, 'public', 'fonts'), { recursive: true });
    const baseCss = await readFile(resolve('src/export/style.css'), 'utf8');
    await writeFile(join(dir, 'style.css'), `${baseCss}\n${buildThemeCss(brand)}`);
    await writeFile(
      join(dir, 'slides.md'),
      buildSlidesMd(
        { title: 'Candidate parity', slides: [slide] },
        {
          vars,
          headmatter: `theme: default\ncolorSchema: light\naspectRatio: 16/9\ncanvasWidth: 1280\nfonts:\n  local: Gilroy\n  sans: sans-serif\nrouterMode: hash`,
        },
      ),
    );
    await execFile(slidev, ['build', '--base', './'], {
      cwd: dir,
      env: { ...process.env, NODE_ENV: 'development' },
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    });

    const served = await staticServer(join(dir, 'dist'));
    server = served.server;
    const nativePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await nativePage.goto(`${served.origin}/#/1`, { waitUntil: 'networkidle' });
    await nativePage.evaluate(() => document.fonts.ready);
    const nativeFrame = nativePage.locator('[data-slidev-no="1"] .slidev-layout');
    expect(await nativeFrame.count()).toBe(1);
    const nativeShot = await nativeFrame.screenshot();

    setVarDoc(vars);
    seedFootnotes(slide.footnotes);
    const preview = renderBlockPreview(slide, buildPreviewRenderContext(['section'], 0, []));
    resetDefs();
    setVarDoc(null);
    expect(preview).not.toBeNull();
    const previewPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await previewPage.route('http://preview.test/media/**', (route) =>
      route.fulfill({ contentType: 'image/svg+xml', body: mediaSvg }),
    );
    await previewPage.route('http://preview.test/fonts/**', async (route) => {
      const filename = new URL(route.request().url()).pathname.split('/').at(-1)!;
      await route.fulfill({ body: await readFile(resolve('public/fonts', filename)) });
    });
    const previewImage = `data:image/svg+xml,${encodeURIComponent(mediaSvg)}`;
    await previewPage.setContent(
      `<style>${baseCss}\n${buildThemeCss(brand)}</style><div class="slidev-layout ${preview!.className} slide-frame--image" style="width:1280px;height:720px;position:relative;display:grid;grid-template-columns:1fr 1fr;padding:0"><div class="slide-frame__content">${preview!.html}</div><div class="slide-frame__image" style="background-image:url('${previewImage}');background-position:center;background-size:cover"></div></div>`,
    );
    await previewPage.evaluate(() => document.fonts.ready);
    const previewFrame = previewPage.locator('.slidev-layout');
    const previewShot = await previewFrame.screenshot();

    const nativePng = sharp(nativeShot).resize(320, 180).removeAlpha();
    const previewPng = sharp(previewShot).resize(320, 180).removeAlpha();
    const [nativeRaw, previewRaw] = await Promise.all([
      nativePng.raw().toBuffer(),
      previewPng.raw().toBuffer(),
    ]);
    let difference = 0;
    for (let index = 0; index < nativeRaw.length; index += 1) {
      difference += Math.abs(nativeRaw[index]! - previewRaw[index]!);
    }
    const meanChannelDifference = difference / nativeRaw.length;
    expect(meanChannelDifference).toBeLessThan(70);

    const [nativeGeometry, previewGeometry] = await Promise.all([
      nativeFrame.locator('.k-center-hero-main').boundingBox(),
      previewFrame.locator('.k-center-hero-main').boundingBox(),
    ]);
    expect(nativeGeometry).not.toBeNull();
    expect(previewGeometry).not.toBeNull();
    expect(Math.abs(nativeGeometry!.x - previewGeometry!.x)).toBeLessThan(400);
    expect(nativeGeometry!.width).toBeGreaterThan(150);
    expect(previewGeometry!.width).toBeGreaterThan(400);
    expect(nativeGeometry!.width).toBeLessThan(700);
    expect(previewGeometry!.width).toBeLessThan(1000);
    expect(await previewFrame.locator('.slidev-layout').count()).toBe(0);
    expect(await previewFrame.textContent()).toContain('Klarc transforme les preuves en décisions');
    expect(await previewFrame.textContent()).toContain('Rapport annuel 2026');
  } finally {
    setVarDoc(null);
    await browser.close();
    if (server) await new Promise<void>((resolveClose) => server!.close(() => resolveClose()));
    await rm(dir, { recursive: true, force: true });
  }
}, 180_000);
