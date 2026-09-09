import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { organisationId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

test.describe('Payload organisation authoring UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author edits branding fields and sees hexadecimal validation', async ({ page }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/organisations/${data.organisationId}`);

    const name = page.locator('input[name="name"]');
    const primary = page.locator('input[name="primary"]');
    const secondary = page.locator('input[name="secondary"]');
    const headingFont = page.locator('input[name="headingFont"]');
    const bodyFont = page.locator('input[name="bodyFont"]');

    await expect(name).toHaveValue('E2E Member Organisation');
    await expect(primary).toHaveValue('#02585C');
    await expect(secondary).toHaveValue('#F5A3B0');
    await expect(headingFont).toHaveValue('Gilroy');
    await expect(bodyFont).toHaveValue('Roboto');

    await primary.fill('not-a-colour');
    const rejected = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organisations/${data.organisationId}`) &&
        response.request().method() === 'PATCH' &&
        response.status() >= 400,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const rejection = await rejected;
    expect(JSON.stringify(await rejection.json())).toMatch(/couleur hexadécimale requise/i);

    await primary.fill('#123456');
    await secondary.fill('#ABCDEF');
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/organisations/${data.organisationId}`) &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await saved;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name="primary"]')).toHaveValue('#123456');
    await expect(page.locator('input[name="secondary"]')).toHaveValue('#abcdef');

    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/organisations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.organisationId);
    expect(stored.status).toBe(200);
    expect(stored.body).toMatchObject({ primary: '#123456', secondary: '#abcdef' });
  });
});
