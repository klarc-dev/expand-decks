import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const adminState = 'test-results/.auth/admin.json';
const authorState = 'test-results/.auth/author.json';

async function prepare(
  request: APIRequestContext,
  deckId: number,
  headers: Record<string, string>,
) {
  const res = await request.post('/api/deck-actions', { data: { deckId }, headers });
  expect(res.status(), await res.text()).toBe(200);
  const data = await res.json();
  return data.confirmationUrl as string;
}

async function disposableDeck(request: APIRequestContext, headers: Record<string, string>) {
  const fixtures = JSON.parse(await readFile('test-results/.auth/fixtures.json', 'utf8'));
  const title = `E2E deck confirmation ${randomUUID()}`;
  const res = await request.post('/api/presentations?depth=0', {
    data: { title, organisation: Number(fixtures.organisationId), language: 'fr', slides: [] },
    headers,
  });
  expect(res.status(), await res.text()).toBe(201);
  return { deckId: (await res.json()).doc.id as number, title };
}

test('deck deletion requires a distinct authenticated session and checks cancellation, staleness, and replay', async ({
  browser,
  baseURL,
}) => {
  const browserAdmin = await browser.newContext({ baseURL, storageState: adminState });
  const requester = await browser.newContext({ baseURL });
  const author = await browser.newContext({ baseURL, storageState: authorState });
  try {
    const login = await requester.request.post('/api/users/login', {
      data: { email: 'e2e-admin@expand.local', password: 'E2e-admin-password-4317' },
    });
    expect(login.ok()).toBeTruthy();
    const bearer = { Authorization: `JWT ${(await login.json()).token}` };
    const { deckId, title } = await disposableDeck(requester.request, bearer);
    const path = `/api/presentations/${deckId}?depth=0`;
    const forbidden = await author.request.post('/api/deck-actions', {
      data: { deckId },
      headers: { 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(forbidden.status()).toBe(403);
    const rawDelete = await requester.request.delete(path, { headers: bearer });
    expect(rawDelete.status()).toBe(403);
    const rawTransfer = await requester.request.patch(path, {
      headers: bearer,
      data: {
        organisation: Number(
          JSON.parse(await readFile('test-results/.auth/fixtures.json', 'utf8'))
            .foreignOrganisationId,
        ),
      },
    });
    expect(rawTransfer.status()).toBe(403);

    const cancelled = await prepare(requester.request, deckId, bearer);
    const requesterPage = await requester.newPage();
    expect((await requesterPage.goto(cancelled))?.status()).toBe(403);
    const authorPage = await author.newPage();
    expect((await authorPage.goto(cancelled))?.status()).toBe(403);
    const page = await browserAdmin.newPage();
    await page.goto(cancelled);
    await expect(page.getByText(title)).toBeVisible();
    expect((await requester.request.get(path, { headers: bearer })).status()).toBe(200);
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('heading', { name: 'Suppression annulée' })).toBeVisible();
    expect((await page.goto(cancelled))?.status()).toBe(409);
    expect((await requester.request.get(path, { headers: bearer })).status()).toBe(200);

    const stale = await prepare(requester.request, deckId, bearer);
    await page.goto(stale);
    const update = await requester.request.patch(path, {
      data: { title: `${title} (modifié)` },
      headers: bearer,
    });
    expect(update.status()).toBe(200);
    await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(page.getByText('La présentation a été modifiée.', { exact: false })).toBeVisible();
    expect((await requester.request.get(path, { headers: bearer })).status()).toBe(200);

    const approved = await prepare(requester.request, deckId, bearer);
    await page.goto(approved);
    await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(page.getByRole('heading', { name: 'Suppression effectuée' })).toBeVisible();
    expect((await requester.request.get(path, { headers: bearer })).status()).toBe(404);
    expect((await page.goto(approved))?.status()).toBe(409);
  } finally {
    await Promise.all([browserAdmin.close(), requester.close(), author.close()]);
  }
});
