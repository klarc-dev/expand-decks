import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { uiPresentationId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

test.describe('Payload presentation authoring UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author edits and saves a presentation through the real admin form', async ({ page }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.uiPresentationId}`);

    const title = page.locator('input[name="title"]');
    await expect(title).toHaveValue('E2E UI Presentation');
    await expect(page.getByRole('button', { name: 'Contenu', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IA', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Réglages', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sortie', exact: true })).toBeVisible();

    await title.fill('E2E UI Presentation Edited');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/successfully|succès|mise à jour/i).first()).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name="title"]')).toHaveValue('E2E UI Presentation Edited');

    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.uiPresentationId);
    expect(stored.status).toBe(200);
    expect(stored.body.title).toBe('E2E UI Presentation Edited');
    expect(stored.body.slug).toBe('e2e-ui-presentation');
  });

  test('author creates a presentation with their default organisation', async ({ page }) => {
    await page.goto('/admin/collections/presentations/create');

    const title = page.locator('input[name="title"]');
    await expect(title).toBeVisible();
    await expect(page.getByText('E2E Member Organisation', { exact: true })).toBeVisible();

    await title.fill('E2E UI Created Presentation');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/successfully|succès|créé/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/collections\/presentations\/[^/]+$/);

    const id = new URL(page.url()).pathname.split('/').pop();
    const stored = await page.evaluate(async (presentationId) => {
      const response = await fetch(`/api/presentations/${presentationId}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, id);
    expect(stored.status).toBe(200);
    expect(stored.body).toMatchObject({
      title: 'E2E UI Created Presentation',
      status: 'draft',
      language: 'fr',
    });
    expect(stored.body.organisation).toBeTruthy();
    expect(stored.body.slug).toMatch(/^e2e-ui-created-presentation/);
  });

  test('required title validation prevents an invalid save', async ({ page }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.uiPresentationId}`);
    const title = page.locator('input[name="title"]');
    await title.fill('');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/required|requis/i).first()).toBeVisible();
    await expect(title).toHaveValue('');
  });
});
