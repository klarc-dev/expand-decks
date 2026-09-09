import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = {
  foreignOrganisationId: string;
  foreignPresentationId: string;
  organisationId: string;
  presentationId: string;
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

test.describe('presentation and organisation access boundaries', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous REST access is denied', async ({ request }) => {
    const data = await fixtures();
    const presentation = await request.get(`/api/presentations/${data.presentationId}`);
    expect([401, 403]).toContain(presentation.status());
    const organisations = await request.get('/api/organisations');
    expect([401, 403]).toContain(organisations.status());
  });

  for (const [role, storageState] of [
    ['author', E2E_AUTHOR_AUTH_FILE],
    ['viewer', E2E_VIEWER_AUTH_FILE],
  ] as const) {
    test(`${role} reads member resources but cannot discover foreign resources`, async ({
      browser,
    }) => {
      const data = await fixtures();
      const { context, page } = await authenticatedPage(browser, storageState, baseURL);

      const ownPresentation = await page.evaluate(async (id) => {
        const response = await fetch(`/api/presentations/${id}?depth=0`);
        return { body: await response.json(), status: response.status };
      }, data.presentationId);
      expect(ownPresentation.status).toBe(200);
      expect(ownPresentation.body.title).toBe('E2E Member Presentation');

      const foreignPresentation = await page.evaluate(async (id) => {
        const response = await fetch(`/api/presentations/${id}?depth=0`);
        return response.status;
      }, data.foreignPresentationId);
      expect(foreignPresentation).toBe(404);

      const ownOrganisation = await page.evaluate(async (id) => {
        const response = await fetch(`/api/organisations/${id}?depth=0`);
        return response.status;
      }, data.organisationId);
      expect(ownOrganisation).toBe(200);

      const foreignOrganisation = await page.evaluate(async (id) => {
        const response = await fetch(`/api/organisations/${id}?depth=0`);
        return response.status;
      }, data.foreignOrganisationId);
      expect(foreignOrganisation).toBe(404);

      await context.close();
    });
  }

  test('author can update a member presentation but cannot move it to another organisation', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);

    const updatedTitle = 'E2E Member Presentation Updated';
    const update = await page.evaluate(
      async ({ id, title }) => {
        const response = await fetch(`/api/presentations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        return { body: await response.json(), status: response.status };
      },
      { id: data.presentationId, title: updatedTitle },
    );
    expect(update.status).toBe(200);
    expect(update.body.doc.title).toBe(updatedTitle);

    const move = await page.evaluate(
      async ({ id, organisation }) => {
        const response = await fetch(`/api/presentations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organisation }),
        });
        return { body: await response.json(), status: response.status };
      },
      { id: data.presentationId, organisation: data.foreignOrganisationId },
    );
    expect(move.status).toBe(400);
    expect(JSON.stringify(move.body)).toMatch(/pas membre|organisation/i);

    const readBack = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.presentationId);
    expect(readBack.status).toBe(200);
    expect(String(readBack.body.organisation)).toBe(data.organisationId);

    await context.close();
  });

  test('viewer cannot create presentations or organisations', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_VIEWER_AUTH_FILE, baseURL);

    const presentation = await page.evaluate(async (organisation) => {
      const response = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Forbidden Viewer Presentation',
          slug: 'forbidden-viewer-presentation',
          organisation,
          language: 'fr',
          status: 'draft',
          slides: [],
        }),
      });
      return response.status;
    }, data.organisationId);
    expect(presentation).toBe(403);

    const presentationUpdate = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Forbidden Viewer Update' }),
      });
      return response.status;
    }, data.presentationId);
    expect(presentationUpdate).toBe(403);

    const organisation = await page.evaluate(async () => {
      const response = await fetch('/api/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Forbidden Viewer Organisation' }),
      });
      return response.status;
    });
    expect(organisation).toBe(403);

    const organisationUpdate = await page.evaluate(async (id) => {
      const response = await fetch(`/api/organisations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Forbidden Viewer Organisation Update' }),
      });
      return response.status;
    }, data.organisationId);
    expect(organisationUpdate).toBe(403);

    const build = await page.evaluate(async (id) => {
      return (await fetch(`/api/presentations/${id}/build`, { method: 'POST' })).status;
    }, data.presentationId);
    expect(build).toBe(403);

    const draft = await page.evaluate(async (presentationId) => {
      const response = await fetch('/api/agent-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationId,
          brief: 'Create a concise three-slide presentation.',
          mode: 'replace',
          visual: false,
          approvalRequired: false,
          sourcePolicy: { mode: 'none', sourceIds: [] },
        }),
      });
      return response.status;
    }, data.presentationId);
    expect(draft).toBe(403);

    await context.close();
  });

  test('only admins can delete presentations', async ({ browser }) => {
    const data = await fixtures();
    const author = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const denied = await author.page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}`, { method: 'DELETE' });
      return response.status;
    }, data.presentationId);
    expect(denied).toBe(403);
    await author.context.close();

    const admin = await authenticatedPage(browser, E2E_ADMIN_AUTH_FILE, baseURL);
    const created = await admin.page.evaluate(async (organisation) => {
      const response = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'E2E Disposable Presentation',
          slug: 'e2e-disposable-presentation',
          organisation,
          language: 'fr',
          status: 'draft',
          slides: [],
        }),
      });
      return { body: await response.json(), status: response.status };
    }, data.organisationId);
    expect(created.status).toBe(201);
    const createdId = String(created.body.doc.id);
    const deleted = await admin.page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}`, { method: 'DELETE' });
      return response.status;
    }, createdId);
    expect(deleted).toBe(200);
    await admin.context.close();
  });
});
