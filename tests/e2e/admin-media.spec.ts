import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.describe('Payload media-library UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author uploads an image with alternative text through the real admin form', async ({
    page,
  }) => {
    await page.goto('/admin/collections/media/create');

    const file = page.locator('input[type="file"]');
    await expect(file).toBeAttached();
    await file.setInputFiles({
      name: 'e2e-ui-pixel.png',
      mimeType: 'image/png',
      buffer: PIXEL,
    });

    const alt = page.locator('input[name="alt"]');
    await expect(alt).toBeVisible();
    await alt.fill('E2E accessible pixel');

    const created = page.waitForResponse(
      (response) =>
        response.url().includes('/api/media') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const response = await created;
    const result = await response.json();
    const mediaId = String(result.doc?.id ?? result.id);

    await expect(page).toHaveURL(new RegExp(`/admin/collections/media/${mediaId}$`));
    await expect(page.locator('input[name="alt"]')).toHaveValue('E2E accessible pixel');

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

test.describe('Payload media administration UI', () => {
  test.use({ storageState: E2E_ADMIN_AUTH_FILE });

  test('admin edits media metadata and deletes the record through the real admin form', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);

    await page.goto('/admin/collections/media/create');

    const file = page.locator('input[type="file"]');
    await expect(file).toBeAttached();
    await file.setInputFiles({
      name: `e2e-admin-pixel-retry-${testInfo.retry}.png`,
      mimeType: 'image/png',
      buffer: PIXEL,
    });

    const alt = page.locator('input[name="alt"]');
    await expect(alt).toBeVisible();
    await alt.fill('E2E admin editable media');

    const created = page.waitForResponse(
      (response) =>
        response.url().includes('/api/media') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const response = await created;
    const result = await response.json();
    const mediaId = String(result.doc?.id ?? result.id);

    await expect(page).toHaveURL(new RegExp(`/admin/collections/media/${mediaId}$`));
    await expect(alt).toHaveValue('E2E admin editable media');
    await alt.fill('E2E admin updated media');
    const updated = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/media/${mediaId}`) &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await updated;
    await expect(alt).toHaveValue('E2E admin updated media');

    const deleted = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/media/${mediaId}`) &&
        response.request().method() === 'DELETE' &&
        response.status() === 200,
    );
    const saveControls = page.getByRole('button', { name: 'Save', exact: true }).locator('..');
    await saveControls.getByRole('button').nth(1).click();
    await page.getByText('Delete', { exact: true }).click();
    await page
      .getByRole('button', { name: /confirm|delete/i })
      .last()
      .click();
    await deleted;
    await expect(page).toHaveURL(/\/admin\/collections\/media(?:\?.*)?$/);

    const status = await page.evaluate(
      async (id) => (await fetch(`/api/media/${id}`)).status,
      mediaId,
    );
    expect(status).toBe(404);
  });
});
