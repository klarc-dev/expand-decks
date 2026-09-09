import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = {
  emptyKnowledgeBaseId: string;
  foreignPresentationId: string;
  knowledgeBaseId: string;
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

const section = { blockType: 'section', title: 'Preview section', number: '02' };

test.describe('preview and source discovery APIs', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous access is rejected', async ({ request }) => {
    expect((await request.get('/api/agent-sources')).status()).toBe(401);
    expect(
      (
        await request.post('/api/slide-preview', {
          data: { presentationId: '1', block: section },
        })
      ).status(),
    ).toBe(401);
  });

  test('source discovery exposes accessible knowledge without server configuration', async ({
    browser,
  }) => {
    const data = await fixtures();
    for (const storageState of [E2E_AUTHOR_AUTH_FILE, E2E_VIEWER_AUTH_FILE]) {
      const { context, page } = await authenticatedPage(browser, storageState, baseURL);
      const response = await page.evaluate(async () => {
        const result = await fetch('/api/agent-sources');
        return { body: await result.json(), status: result.status };
      });
      expect(response.status).toBe(200);
      expect(response.body.maxSelected).toBe(8);
      expect(response.body.sources).toContainEqual({
        id: `knowledge_${data.emptyKnowledgeBaseId}`,
        kind: 'knowledge',
        label: 'E2E Empty Knowledge Base',
        readiness: 'empty',
      });
      expect(JSON.stringify(response.body)).not.toContain('command');
      expect(JSON.stringify(response.body)).not.toContain('env');
      expect(JSON.stringify(response.body)).not.toContain('indexName');
      await context.close();
    }
  });

  test('validates preview requests and hides foreign presentations', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(
      async ({ foreignPresentationId, previewBlock }) => {
        const post = async (body: object) =>
          (
            await fetch('/api/slide-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          ).status;
        return {
          invalidBlock: await post({ presentationId: '1', block: {} }),
          missingPresentation: await post({ block: previewBlock }),
          foreign: await post({ presentationId: foreignPresentationId, block: previewBlock }),
        };
      },
      { ...data, previewBlock: section },
    );
    expect(statuses.missingPresentation).toBe(400);
    expect(statuses.invalidBlock).toBe(400);
    expect(statuses.foreign).toBe(404);
    await context.close();
  });

  test('renders a real preview with organisation chrome and no shared cache header', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const response = await page.evaluate(
      async ({ organisationId, presentationId, previewBlock }) => {
        const result = await fetch('/api/slide-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            presentationId,
            block: previewBlock,
            fields: {
              organisation: organisationId,
              title: 'Preview Deck',
              language: 'fr',
              'footer.enabled': true,
              'footer.left': '{org.name}',
              'footer.right': '{page} / {total}',
              'slides.0.blockType': 'cover',
              'slides.1.blockType': 'section',
            },
            previewFieldPath: 'slides.1.preview',
            blockTypes: ['cover', 'section'],
            slideIndex: 1,
          }),
        });
        return {
          body: await result.json(),
          cacheControl: result.headers.get('cache-control'),
          status: result.status,
        };
      },
      { ...data, previewBlock: section },
    );
    expect(response.status).toBe(200);
    expect(response.cacheControl).toBe('private, no-store');
    expect(response.body.preview.html).toContain('Preview section');
    expect(response.body.chrome.hidden).toBe(true);
    expect(response.body.chrome.footer).toEqual({
      center: '',
      left: 'E2E Member Organisation',
      right: '2 / 2',
    });
    expect(response.body.chrome.fonts).toEqual({ body: 'Roboto', heading: 'Gilroy' });
    await context.close();
  });

  test('rejects schema-invalid slide content with actionable issues', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const response = await page.evaluate(async (presentationId) => {
      const result = await fetch('/api/slide-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentationId,
          block: { blockType: 'section', title: 'X'.repeat(181) },
        }),
      });
      return { body: await result.json(), status: result.status };
    }, data.presentationId);
    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Contenu de slide invalide');
    expect(response.body.issues.length).toBeGreaterThan(0);
    await context.close();
  });
});
