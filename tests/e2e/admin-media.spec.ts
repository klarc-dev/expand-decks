import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function uploadMedia(
  page: import('@playwright/test').Page,
  name: string,
  alt: string,
): Promise<{ body: Record<string, any>; status: number }> {
  return page.evaluate(
    async ({ bytes, filename, alternativeText }) => {
      const form = new FormData();
      form.set('file', new File([new Uint8Array(bytes)], filename, { type: 'image/png' }));
      form.set('_payload', JSON.stringify({ alt: alternativeText }));
      const response = await fetch('/api/media', { method: 'POST', body: form });
      return { body: await response.json(), status: response.status };
    },
    { bytes: [...PIXEL], filename: name, alternativeText: alt },
  );
}

test.describe('Payload media API', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author uploads an image with alternative text', async ({ page }) => {
    await page.goto('/admin');
    const result = await uploadMedia(page, 'e2e-ui-pixel.png', 'E2E accessible pixel');
    expect(result.status).toBe(201);
    const mediaId = String(result.body.doc?.id ?? result.body.id);

    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/media/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, mediaId);
    expect(stored.status).toBe(200);
    expect(stored.body).toMatchObject({
      alt: 'E2E accessible pixel',
      mimeType: 'image/png',
    });
    expect(stored.body.filename).toMatch(/^e2e-ui-pixel(?:-\d+)?\.png$/);
    expect(stored.body.presentation).toBeFalsy();
  });
});

test.describe('Payload media administration API', () => {
  test.use({ storageState: E2E_ADMIN_AUTH_FILE });

  test('admin edits media metadata and deletes the record', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto('/admin');
    const created = await uploadMedia(
      page,
      `e2e-admin-pixel-retry-${testInfo.retry}.png`,
      'E2E admin editable media',
    );
    expect(created.status).toBe(201);
    const mediaId = String(created.body.doc?.id ?? created.body.id);

    const updated = await page.evaluate(async (id) => {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alt: 'E2E admin updated media' }),
      });
      return { body: await response.json(), status: response.status };
    }, mediaId);
    expect(updated.status).toBe(200);
    expect(updated.body.doc?.alt ?? updated.body.alt).toBe('E2E admin updated media');

    const deleted = await page.evaluate(
      async (id) => (await fetch(`/api/media/${id}`, { method: 'DELETE' })).status,
      mediaId,
    );
    expect(deleted).toBe(200);

    const status = await page.evaluate(
      async (id) => (await fetch(`/api/media/${id}`)).status,
      mediaId,
    );
    expect(status).toBe(404);
  });
});
