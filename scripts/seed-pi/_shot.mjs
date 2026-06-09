import { chromium } from '/Users/joachimbrindeau/Development/expand/production/slides/slidev-workspace/node_modules/playwright-chromium/index.js';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const msgs = [];
page.on('console', (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => msgs.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:8799/index.html#30', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
// Inspect the mermaid container
const info = await page.evaluate(() => {
  const el = document.querySelector('.k-mermaid');
  if (!el) return { found: false, html: document.body.innerHTML.slice(0, 400) };
  const svg = el.querySelector('svg');
  const r = el.getBoundingClientRect();
  return {
    found: true,
    box: { w: Math.round(r.width), h: Math.round(r.height) },
    svg: svg
      ? {
          w: svg.getAttribute('width'),
          h: svg.getAttribute('height'),
          style: svg.getAttribute('style'),
          viewBox: svg.getAttribute('viewBox'),
        }
      : null,
  };
});
console.log('mermaid info:', JSON.stringify(info, null, 2));
console.log('console messages:\n' + msgs.join('\n'));
await page.screenshot({ path: '/tmp/pi-slide-30.png' });
await browser.close();
