import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { foreignPresentationId: string; presentationId: string };

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

test.describe('presentation variables endpoint', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('requires authentication', async ({ request }) => {
    const data = await fixtures();
    expect((await request.get(`/api/presentations/${data.presentationId}/vars`)).status()).toBe(
      401,
    );
  });

  for (const [role, storageState] of [
    ['author', E2E_AUTHOR_AUTH_FILE],
    ['viewer', E2E_VIEWER_AUTH_FILE],
  ] as const) {
    test(`${role} receives useful scalar variables without internal data`, async ({ browser }) => {
      const data = await fixtures();
      const { context, page } = await authenticatedPage(browser, storageState, baseURL);
      const response = await page.evaluate(async (id) => {
        const result = await fetch(`/api/presentations/${id}/vars`);
        return { body: await result.json(), status: result.status };
      }, data.presentationId);
      expect(response.status).toBe(200);
      const vars = response.body.vars as Array<{ path: string; sample: string }>;
      expect(vars).toContainEqual(expect.objectContaining({ path: 'title' }));
      expect(vars).toContainEqual({
        path: 'org.name',
        label: 'org.name',
        sample: 'E2E Member Organisation',
      });
      expect(vars).toContainEqual({ path: 'total', label: 'total', sample: '0' });
      expect(vars).toContainEqual(expect.objectContaining({ path: 'date' }));
      const paths = vars.map((entry) => entry.path);
      for (const internal of [
        'id',
        'slides',
        'createdBy',
        'lastBuildStatus',
        'lastBuildError',
        'draftEvents',
        'spaUrl',
        'pdfFile',
      ]) {
        expect(paths).not.toContain(internal);
      }
      await context.close();
    });
  }

  test('conceals foreign and unknown presentations', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(async ({ foreignPresentationId }) => {
      const foreign = await fetch(`/api/presentations/${foreignPresentationId}/vars`);
      const missing = await fetch('/api/presentations/999999999/vars');
      return { foreign: foreign.status, missing: missing.status };
    }, data);
    expect(statuses.foreign).toBe(404);
    expect(statuses.missing).toBe(404);
    await context.close();
  });
});
