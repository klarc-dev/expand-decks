import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, type APIRequestContext } from '@playwright/test';

import { BUILD_COOLDOWN_MS } from '../../src/lib/draftConfig';

type BuildOutput = { status: string; error: string | null; links: { key: string; href: string }[] };

async function connectorHeaders(request: APIRequestContext, role: 'author' | 'viewer') {
  const login = await request.post('/api/users/login', {
    data: { email: `e2e-${role}@expand.local`, password: `E2e-${role}-password-4317` },
  });
  expect(login.status()).toBe(200);
  const { token } = await login.json();
  return { Authorization: `JWT ${token}` };
}

test('author creates and rebuilds a typed deck, then opens its native protected exports', async ({
  browser,
  baseURL,
  request,
}) => {
  test.skip(process.env.E2E_NATIVE_EXPORT !== '1', 'Requires the Slidev workspace and Chromium');
  test.setTimeout(260_000);
  const { organisationId, foreignPresentationId, foreignOrganisationId } = JSON.parse(
    await readFile('test-results/.auth/fixtures.json', 'utf8'),
  );
  const author = await browser.newContext({
    storageState: 'test-results/.auth/author.json',
    baseURL,
  });
  const viewer = await browser.newContext({
    storageState: 'test-results/.auth/viewer.json',
    baseURL,
  });
  const data = {
    title: `Native export E2E ${Date.now()}`,
    organisation: Number(organisationId),
    documentTemplate: 'presentation',
    slides: [{ blockType: 'cover', title: 'Protected export smoke' }],
  };
  const [authorHeaders, viewerHeaders] = await Promise.all([
    connectorHeaders(author.request, 'author'),
    connectorHeaders(viewer.request, 'viewer'),
  ]);
  const write = { data, headers: authorHeaders };
  try {
    expect(
      (await viewer.request.post('/api/presentations', { data, headers: viewerHeaders })).status(),
    ).toBe(403);
    expect(
      (
        await author.request.post('/api/presentations', {
          ...write,
          data: { ...data, organisation: Number(foreignOrganisationId) },
        })
      ).ok(),
    ).toBe(false);
    expect(
      (
        await author.request.get(`/api/deck-outputs/${foreignPresentationId}`, {
          headers: authorHeaders,
        })
      ).status(),
    ).toBe(404);
    const created = await author.request.post('/api/presentations', write);
    expect(created.status(), await created.text()).toBe(201);
    const createdBy = Date.now();
    const id: number = (await created.json()).doc.id;
    const outputs = `/api/deck-outputs/${id}`;
    expect((await request.get(outputs)).status()).toBe(401);
    async function waitForNativeBuild() {
      let result: BuildOutput = { status: '', error: null, links: [] };
      await expect
        .poll(
          async () => {
            const response = await author.request.get(outputs, { headers: authorHeaders });
            expect(response.status()).toBe(200);
            result = await response.json();
            return result.status;
          },
          { timeout: 110_000, intervals: [500, 1_000, 2_000] },
        )
        .toMatch(/^(success|failed)$/);
      expect(result.status, result.error ?? undefined).toBe('success');
      return result;
    }
    const result = await waitForNativeBuild();
    const pdf = result.links.find(({ key }) => key === 'pdf')?.href;
    const web = result.links.find(({ key }) => key === 'web-presentation')?.href;
    expect(pdf).toBeTruthy();
    expect(web).toBeTruthy();
    if (!pdf || !web) throw new Error('Native export links missing');
    const viewerPdf = await viewer.request.get(pdf, { headers: viewerHeaders });
    expect(viewerPdf.status()).toBe(200);
    expect((await viewerPdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    expect((await request.get(pdf)).status()).toBe(403);
    expect((await request.get(web)).status()).toBe(403);
    const page = await author.newPage();
    expect((await page.goto(web))?.status()).toBe(200);
    await expect(page.getByText('Protected export smoke', { exact: true }).first()).toBeVisible();

    // Respect the native cooldown without sending or retrying an early write.
    await delay(Math.max(0, createdBy + BUILD_COOLDOWN_MS - Date.now() + 100));
    const rebuild = await author.request.post(`/api/presentations/${id}/build`, {
      headers: authorHeaders,
    });
    expect(rebuild.status(), await rebuild.text()).toBe(200);
    const { buildToken } = await rebuild.json();
    expect(buildToken).toMatch(/^[0-9a-f-]{36}$/i);
    const rebuilt = await waitForNativeBuild();
    const rebuiltPdf = rebuilt.links.find(({ key }) => key === 'pdf')?.href;
    if (!rebuiltPdf) throw new Error('Rebuilt PDF link missing');
    expect(rebuiltPdf).not.toBe(pdf);
    const deck = await author.request.get(`/api/presentations/${id}?depth=0`, {
      headers: authorHeaders,
    });
    expect(deck.status()).toBe(200);
    expect((await deck.json()).lastBuildToken).toBe(buildToken);
    const opened = await viewer.request.get(rebuiltPdf, { headers: viewerHeaders });
    expect(opened.status()).toBe(200);
    expect((await opened.body()).subarray(0, 5).toString()).toBe('%PDF-');
  } finally {
    // The Playwright database and this uniquely named deck are disposable;
    // a non-admin author cannot delete the deck through Slides.
    await author.close();
    await viewer.close();
  }
});
