import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { buildPresentationId: string; foreignPresentationId: string };

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

test.describe('manual presentation build requests', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous request is rejected', async ({ request }) => {
    const data = await fixtures();
    expect(
      (await request.post(`/api/presentations/${data.buildPresentationId}/build`)).status(),
    ).toBe(401);
  });

  test('viewer cannot request a build', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_VIEWER_AUTH_FILE, baseURL);
    const status = await page.evaluate(async (id) => {
      return (await fetch(`/api/presentations/${id}/build`, { method: 'POST' })).status;
    }, data.buildPresentationId);
    expect(status).toBe(403);
    await context.close();
  });

  test('foreign and unknown presentations are concealed', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(async (foreignId) => {
      const foreign = await fetch(`/api/presentations/${foreignId}/build`, { method: 'POST' });
      const missing = await fetch('/api/presentations/999999999/build', { method: 'POST' });
      return { foreign: foreign.status, missing: missing.status };
    }, data.foreignPresentationId);
    expect(statuses).toEqual({ foreign: 404, missing: 404 });
    await context.close();
  });

  test('author queues one build, stamps metadata, and throttles an immediate retry', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const first = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}/build`, { method: 'POST' });
      return { body: await response.json(), status: response.status };
    }, data.buildPresentationId);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ queued: true, lastBuildStatus: 'building' });
    expect(first.body.buildToken).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Number.isNaN(Date.parse(first.body.lastBuildRequestedAt))).toBe(false);

    const presentation = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.buildPresentationId);
    expect(presentation.status).toBe(200);
    expect(presentation.body.lastBuildToken).toBe(first.body.buildToken);
    expect(presentation.body.lastBuildRequestedAt).toBe(first.body.lastBuildRequestedAt);
    expect(presentation.body.lastBuildStatus).toBe('building');
    expect(presentation.body.lastBuildError ?? '').toBe('');

    const retry = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}/build`, { method: 'POST' });
      return { body: await response.json(), status: response.status };
    }, data.buildPresentationId);
    expect(retry.status).toBe(429);
    expect(retry.body.error).toContain('déjà été demandé récemment');
    await context.close();
  });
});
