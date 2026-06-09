// Fast isolated mermaid-sizing harness: stage a 1-slide deck exactly like the
// build job (slides.md + style.css + headmatter.yaml + setup/mermaid.ts), run
// `slidev build`, serve it, screenshot, and report the rendered SVG rect.
import { execFile } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import http from 'node:http';
import pkg from '/Users/joachimbrindeau/Development/expand/production/slides/slidev-workspace/node_modules/playwright-chromium/index.js';
const { chromium } = pkg;
const exec = promisify(execFile);

const ROOT = '/Users/joachimbrindeau/Development/expand/production/slides';
const WS = join(ROOT, 'slidev-workspace');
const EXPORT = join(ROOT, 'src', 'export');

const wd = mkdtempSync(join(tmpdir(), 'mtest-'));
symlinkSync(join(WS, 'node_modules'), join(wd, 'node_modules'), 'dir');
const css = readFileSync(join(EXPORT, 'style.css'), 'utf-8');
writeFileSync(join(wd, 'style.css'), css);
cpSync(join(EXPORT, 'headmatter.yaml'), join(wd, 'headmatter.yaml'));
mkdirSync(join(wd, 'setup'), { recursive: true });
cpSync(join(EXPORT, 'mermaid-setup.ts'), join(wd, 'setup', 'mermaid.ts'));

const headmatter = readFileSync(join(EXPORT, 'headmatter.yaml'), 'utf-8').trim();
const md = `---
title: mtest
${headmatter}
---

<div class="k-content w-full">

# Choisir l'outil : solution technique

<div class="k-mermaid">

\`\`\`mermaid
flowchart TD
  A["Solution stratégique et exploitable ?"] -->|Non| B["Abandon documenté ou publication défensive (voir S17)"]
  A -->|Oui| C{"Contrefaçon détectable sur le produit/service commercialisé ?"}
  C -->|"Non (procédé interne)"| D["Secret d'affaires si les 3 critères L.151-1 sont tenables"]
  C -->|Oui| E{"Activité inventive solide ?"}
  E -->|Oui| F["Brevet — 20 ans"]
  E -->|"Non ou incertaine"| G["Certificat d'utilité — 10 ans, pas d'examen de fond"]
  C -->|Oui| H{"Cycle de vie de l'innovation court (<10 ans) ?"}
  H -->|Oui| I["Certificat d'utilité — coût réduit, délivrance rapide"]
  H -->|Non| J["Brevet"]
\`\`\`

</div>

</div>
`;
writeFileSync(join(wd, 'slides.md'), md);

console.log('building in', wd);
await exec(join(WS, 'node_modules', '.bin', 'slidev'), ['build', '--base', './'], {
  cwd: wd,
  timeout: 180000,
  maxBuffer: 32 * 1024 * 1024,
});

// serve dist
const dist = join(wd, 'dist');
const server = http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/' || p === '') p = '/index.html';
  try {
    const data = readFileSync(join(dist, p));
    const ext = p.split('.').pop();
    const ct =
      {
        html: 'text/html',
        js: 'text/javascript',
        css: 'text/css',
        json: 'application/json',
        svg: 'image/svg+xml',
        woff2: 'font/woff2',
      }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': ct });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('nf');
  }
});
await new Promise((r) => server.listen(8788, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:8788/index.html#1', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const info = await page.evaluate(() => {
  // Find the mermaid svg = the one with a viewBox and aria-roledescription, or
  // any svg containing flowchart node classes; report its full ancestry chain.
  const all = [...document.querySelectorAll('svg')];
  const mer =
    all.find((s) => s.querySelector('.node, .flowchart-link, [class*="flowchart"]')) ||
    all.find((s) => s.getAttribute('aria-roledescription')?.includes('flowchart'));
  if (mer) {
    const chain = [];
    let n = mer;
    for (let i = 0; i < 6 && n; i++) {
      chain.push(
        n.tagName.toLowerCase() +
          '.' +
          (typeof n.className === 'string' ? n.className : n.className.baseVal || ''),
      );
      n = n.parentElement;
    }
    const r = mer.getBoundingClientRect();
    const cs = getComputedStyle(mer);
    return {
      found: 'mermaid',
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
      attrStyle: mer.getAttribute('style'),
      computedMaxH: cs.maxHeight,
      chain,
    };
  }
  const svg = document.querySelector('svg');
  if (!svg) return { hasSvg: false, totalSvg: all.length };
  const r = svg.getBoundingClientRect();
  const cs = getComputedStyle(svg);
  return {
    hasSvg: true,
    id: svg.id,
    w: Math.round(r.width),
    h: Math.round(r.height),
    bottom: Math.round(r.bottom),
    attrStyle: svg.getAttribute('style'),
    attrHeight: svg.getAttribute('height'),
    attrWidth: svg.getAttribute('width'),
    computedMaxH: cs.maxHeight,
    computedH: cs.height,
    ancestorKMermaid: !!svg.closest('.k-mermaid'),
  };
});
console.log('SVG=' + JSON.stringify(info));
await page.screenshot({ path: '/tmp/mtest.png' });
await browser.close();
server.close();
process.exit(0);
