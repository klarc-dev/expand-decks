import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { knowledgeBaseId: string; knowledgeDocumentId: string };

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

async function uploadTextDocument(
  page: import('@playwright/test').Page,
  knowledgeBaseId: string,
  filename: string,
  mimeType: string,
  body: string,
) {
  return page.evaluate(
    async ({ knowledgeBaseId, filename, mimeType, body }) => {
      const form = new FormData();
      form.append('_payload', JSON.stringify({ knowledgeBase: knowledgeBaseId }));
      form.append('file', new File([body], filename, { type: mimeType }));
      const response = await fetch('/api/knowledge-documents', { method: 'POST', body: form });
      return { body: await response.json(), status: response.status };
    },
    { knowledgeBaseId, filename, mimeType, body },
  );
}

test.describe('knowledge document and media access', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous users cannot upload documents or media', async ({ browser }) => {
    const data = await fixtures();
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('/admin/login');
    const statuses = await page.evaluate(async (knowledgeBaseId) => {
      const documentForm = new FormData();
      documentForm.append('_payload', JSON.stringify({ knowledgeBase: knowledgeBaseId }));
      documentForm.append('file', new File(['private'], 'anonymous.txt', { type: 'text/plain' }));
      const document = await fetch('/api/knowledge-documents', {
        method: 'POST',
        body: documentForm,
      });

      const mediaForm = new FormData();
      mediaForm.append('_payload', JSON.stringify({ alt: 'anonymous upload' }));
      mediaForm.append('file', new File(['not-an-image'], 'pixel.png', { type: 'image/png' }));
      const media = await fetch('/api/media', { method: 'POST', body: mediaForm });
      return { document: document.status, media: media.status };
    }, data.knowledgeBaseId);
    expect(statuses).toEqual({ document: 403, media: 403 });
    await context.close();
  });

  test('author and viewer read an accessible knowledge document', async ({ browser }) => {
    const data = await fixtures();
    for (const storageState of [E2E_AUTHOR_AUTH_FILE, E2E_VIEWER_AUTH_FILE]) {
      const { context, page } = await authenticatedPage(browser, storageState, baseURL);
      const read = await page.evaluate(async (id) => {
        const response = await fetch(`/api/knowledge-documents/${id}`);
        return { body: await response.json(), status: response.status };
      }, data.knowledgeDocumentId);
      expect(read.status).toBe(200);
      expect(read.body.filename).toMatch(/^e2e-knowledge(?:-\d+)?\.txt$/);
      expect(read.body.mimeType).toBe('text/plain');
      expect(read.body.indexingStatus).toBe('pending');
      await context.close();
    }
  });

  test('REST upload validates unsupported and invalid content before persistence', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const unsupported = await uploadTextDocument(
      page,
      data.knowledgeBaseId,
      'unsupported.csv',
      'text/csv',
      'a,b',
    );
    expect(unsupported.status).toBe(400);
    expect(JSON.stringify(unsupported.body)).toContain('not allowed');

    const binaryText = await uploadTextDocument(
      page,
      data.knowledgeBaseId,
      'binary.txt',
      'text/plain',
      'before\u0000after',
    );
    expect(binaryText.status).toBe(400);
    await context.close();
  });

  test('viewer cannot upload, mutate, delete, or retry knowledge documents', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_VIEWER_AUTH_FILE, baseURL);
    const upload = await uploadTextDocument(
      page,
      data.knowledgeBaseId,
      'viewer-upload.txt',
      'text/plain',
      'forbidden',
    );
    expect(upload.status).toBe(403);

    const statuses = await page.evaluate(async (id) => {
      const update = await fetch(`/api/knowledge-documents/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ knowledgeBase: 999999999 }),
      });
      const retry = await fetch(`/api/knowledge-documents/${id}/retry`, { method: 'POST' });
      const remove = await fetch(`/api/knowledge-documents/${id}`, { method: 'DELETE' });
      return { update: update.status, retry: retry.status, remove: remove.status };
    }, data.knowledgeDocumentId);
    expect(statuses).toEqual({ update: 403, retry: 403, remove: 403 });
    await context.close();
  });

  test('retry rejects a pending document and unknown document', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(async (id) => {
      const pending = await fetch(`/api/knowledge-documents/${id}/retry`, { method: 'POST' });
      const missing = await fetch('/api/knowledge-documents/999999999/retry', { method: 'POST' });
      return { pending: pending.status, missing: missing.status };
    }, data.knowledgeDocumentId);
    expect(statuses).toEqual({ pending: 409, missing: 404 });
    await context.close();
  });

  test('author can upload ordinary media while viewer cannot', async ({ browser }) => {
    const uploadPixel = async (storageState: string, alt: string) => {
      const session = await authenticatedPage(browser, storageState, baseURL);
      const result = await session.page.evaluate(async (altText) => {
        const form = new FormData();
        form.append('_payload', JSON.stringify({ alt: altText }));
        form.append(
          'file',
          new File(
            [
              Uint8Array.from(
                atob(
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                ),
                (char) => char.charCodeAt(0),
              ),
            ],
            'pixel.png',
            { type: 'image/png' },
          ),
        );
        const response = await fetch('/api/media', { method: 'POST', body: form });
        return { body: await response.json(), status: response.status };
      }, alt);
      await session.context.close();
      return result;
    };

    const authorUpload = await uploadPixel(E2E_AUTHOR_AUTH_FILE, 'E2E pixel');
    expect(authorUpload.status).toBe(201);
    expect(authorUpload.body.doc.mimeType).toBe('image/png');

    const viewerUpload = await uploadPixel(E2E_VIEWER_AUTH_FILE, 'Forbidden pixel');
    expect(viewerUpload.status).toBe(403);

    const adminSession = await authenticatedPage(browser, E2E_ADMIN_AUTH_FILE, baseURL);
    const removed = await adminSession.page.evaluate(async (id) => {
      return (await fetch(`/api/media/${id}`, { method: 'DELETE' })).status;
    }, authorUpload.body.doc.id);
    expect(removed).toBe(200);
    await adminSession.context.close();
  });
});
