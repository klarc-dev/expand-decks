import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = {
  foreignPresentationId: string;
  slideCrudPresentationId: string;
};

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

async function authenticatedPage(
  browser: import('@playwright/test').Browser,
  storageState: string,
  baseURL: string,
) {
  const context = await browser.newContext({ storageState, baseURL });
  const page = await context.newPage();
  await page.goto('/admin');
  return { context, page };
}

const section = (title: string, number: string) => ({ blockType: 'section', title, number });

test.describe('deck slide CRUD API', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous requests are rejected before validation', async ({ request }) => {
    const response = await request.get('/api/deck-slides');
    expect(response.status()).toBe(401);
    const mutation = await request.post('/api/deck-slides', { data: {} });
    expect(mutation.status()).toBe(401);
  });

  test('validates missing deck and malformed mutations', async ({ browser }) => {
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const missing = await page.evaluate(async () => (await fetch('/api/deck-slides')).status);
    expect(missing).toBe(400);
    const malformed = await page.evaluate(async () => {
      const response = await fetch('/api/deck-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      return response.status;
    });
    expect(malformed).toBe(400);
    await context.close();
  });

  test('author creates, reads, updates, moves, and deletes slides', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);

    const mutate = (body: object) =>
      page.evaluate(async (payload) => {
        const response = await fetch('/api/deck-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { body: await response.json(), status: response.status };
      }, body);

    const first = await mutate({
      action: 'create',
      deckId: data.slideCrudPresentationId,
      slide: section('First section', '01'),
    });
    expect(first.status).toBe(200);
    expect(first.body.slides).toHaveLength(1);

    const inserted = await mutate({
      action: 'create',
      deckId: data.slideCrudPresentationId,
      index: 0,
      slide: section('Inserted section', '00'),
    });
    expect(inserted.status).toBe(200);
    expect(inserted.body.slides.map((slide: { title: string }) => slide.title)).toEqual([
      'Inserted section',
      'First section',
    ]);

    const all = await page.evaluate(async (deckId) => {
      const response = await fetch(`/api/deck-slides?deckId=${deckId}`);
      return { body: await response.json(), status: response.status };
    }, data.slideCrudPresentationId);
    expect(all.status).toBe(200);
    expect(all.body.slides).toHaveLength(2);

    const one = await page.evaluate(async (deckId) => {
      const response = await fetch(`/api/deck-slides?deckId=${deckId}&slideIndex=1`);
      return { body: await response.json(), status: response.status };
    }, data.slideCrudPresentationId);
    expect(one.status).toBe(200);
    expect(one.body.slide.title).toBe('First section');

    const updated = await mutate({
      action: 'update',
      deckId: data.slideCrudPresentationId,
      slideIndex: 1,
      slide: section('Updated section', '02'),
    });
    expect(updated.status).toBe(200);
    expect(updated.body.slides[1].title).toBe('Updated section');

    const moved = await mutate({
      action: 'move',
      deckId: data.slideCrudPresentationId,
      slideIndex: 1,
      toIndex: 0,
    });
    expect(moved.status).toBe(200);
    expect(moved.body.slides[0].title).toBe('Updated section');

    const deleted = await mutate({
      action: 'delete',
      deckId: data.slideCrudPresentationId,
      slideIndex: 1,
    });
    expect(deleted.status).toBe(200);
    expect(deleted.body.slides).toHaveLength(1);
    expect(deleted.body.slides[0].title).toBe('Updated section');

    await context.close();
  });

  test('returns 404 for out-of-range slide operations', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    for (const body of [
      {
        action: 'update',
        deckId: data.slideCrudPresentationId,
        slideIndex: 999,
        slide: section('Missing', '99'),
      },
      { action: 'delete', deckId: data.slideCrudPresentationId, slideIndex: 999 },
      { action: 'move', deckId: data.slideCrudPresentationId, slideIndex: 999, toIndex: 0 },
    ]) {
      const status = await page.evaluate(async (payload) => {
        const response = await fetch('/api/deck-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return response.status;
      }, body);
      expect(status).toBe(404);
    }
    await context.close();
  });

  test('member cannot access a foreign deck through slide endpoints', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const read = await page.evaluate(async (deckId) => {
      return (await fetch(`/api/deck-slides?deckId=${deckId}`)).status;
    }, data.foreignPresentationId);
    expect(read).toBe(404);
    const write = await page.evaluate(
      async ({ deckId, slide }) => {
        const response = await fetch('/api/deck-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', deckId, slide }),
        });
        return response.status;
      },
      { deckId: data.foreignPresentationId, slide: section('Foreign', '01') },
    );
    expect(write).toBe(404);
    await context.close();
  });

  test('viewer can read but cannot mutate slides', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_VIEWER_AUTH_FILE, baseURL);
    const read = await page.evaluate(async (deckId) => {
      return (await fetch(`/api/deck-slides?deckId=${deckId}`)).status;
    }, data.slideCrudPresentationId);
    expect(read).toBe(200);
    const write = await page.evaluate(
      async ({ deckId, slide }) => {
        const response = await fetch('/api/deck-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', deckId, slide }),
        });
        return response.status;
      },
      { deckId: data.slideCrudPresentationId, slide: section('Viewer write', '03') },
    );
    expect(write).toBe(403);
    await context.close();
  });
});
