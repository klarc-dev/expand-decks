import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');

const deckURL = '/spa/e2e-spa-presentation/index.html';
const assetURL = '/spa/e2e-spa-presentation/assets/app.js';

test.describe('built SPA access and file serving', () => {
  test('anonymous visitors cannot read a deck or its assets', async ({ request }) => {
    const html = await request.get(deckURL);
    expect(html.status()).toBe(403);
    expect(await html.text()).toBe('Forbidden');

    const asset = await request.get(assetURL);
    expect(asset.status()).toBe(403);
    expect(await asset.text()).toBe('Forbidden');
  });

  for (const [role, storageState] of [
    ['author', E2E_AUTHOR_AUTH_FILE],
    ['viewer', E2E_VIEWER_AUTH_FILE],
  ] as const) {
    test(`${role} can load an authorised SPA and its assets`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ storageState, baseURL });
      const page = await context.newPage();
      const response = await page.goto(deckURL);
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-type']).toContain('text/html');
      expect(response?.headers()['cache-control']).toBe('no-cache');
      expect(response?.headers()['x-content-type-options']).toBe('nosniff');
      const html = await response?.text();
      expect(html).toContain('E2E built deck');
      expect(html).toContain('/spa/e2e-spa-presentation/assets/app.js');

      const asset = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return {
          body: await response.text(),
          headers: Object.fromEntries(response.headers.entries()),
          status: response.status,
        };
      }, assetURL);
      expect(asset.status).toBe(200);
      expect(asset.body).toContain('__E2E_DECK_LOADED__');
      expect(asset.headers['content-type']).toContain('application/javascript');
      expect(asset.headers['cache-control']).toBe('public, max-age=3600, immutable');
      expect(asset.headers['x-content-type-options']).toBe('nosniff');
      await context.close();
    });
  }

  test('member cannot fetch a foreign organisation SPA', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ storageState: E2E_AUTHOR_AUTH_FILE, baseURL });
    const response = await context.request.get('/spa/e2e-foreign-presentation/index.html');
    expect(response.status()).toBe(403);
    expect(await response.text()).toBe('Forbidden');
    await context.close();
  });

  test('authenticated user receives 404 for unknown deck and missing files', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ storageState: E2E_AUTHOR_AUTH_FILE, baseURL });
    const page = await context.newPage();
    await page.goto('/admin');
    const missingDeck = await page.evaluate(async () => {
      const response = await fetch('/spa/e2e-no-such-deck/index.html');
      return { body: await response.text(), status: response.status };
    });
    expect(missingDeck.status).toBe(404);
    expect(missingDeck.body).toBe('Not found');

    const missingFile = await page.evaluate(async () => {
      const response = await fetch('/spa/e2e-spa-presentation/assets/missing.js');
      return { body: await response.text(), status: response.status };
    });
    expect(missingFile.status).toBe(404);
    expect(missingFile.body).toBe('Not found');
    await context.close();
  });

  test('rejects invalid slugs before authentication or filesystem access', async ({ request }) => {
    const response = await request.get('/spa/invalid%20slug/index.html');
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('Not found');
  });
});
