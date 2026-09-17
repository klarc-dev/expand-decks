import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { failedBuildPresentationId: string; successfulBuildPresentationId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

test.describe('Payload build-status UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('successful builds expose the generated web and PDF artifacts', async ({ page }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.successfulBuildPresentationId}`);
    await expect(page.locator('input[name="title"]')).toHaveValue(
      'E2E Successful Build Presentation',
    );
    const webLink = page.getByRole('link', { name: 'Aperçu', exact: true });
    await expect(webLink).toBeVisible();

    const pdfLink = page.getByRole('link', { name: /télécharger le pdf/i });
    await expect(webLink).toHaveAttribute(
      'href',
      '/spa/e2e-successful-build-presentation/index.html',
    );
    await expect(pdfLink).toHaveAttribute(
      'href',
      /\/api\/media\/file\/e2e-successful-build(?:-\d+)?\.pdf$/,
    );
    const actions = page.getByRole('group', { name: 'Actions de la présentation' });
    await expect(actions).toBeVisible();
    await expect(pdfLink.locator('.lucide-download.presentation-action-icon')).toBeVisible();
    await expect(webLink.locator('.lucide-external-link.presentation-action-icon')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sauvegarder' })).toHaveAttribute(
      'title',
      'Sauvegarder',
    );
    await expect(
      page
        .getByRole('button', { name: 'Sauvegarder' })
        .locator('.lucide-save.presentation-action-icon'),
    ).toBeVisible();
    const overflow = page.getByRole('button', { name: "Plus d'actions" });
    await expect(overflow).toHaveAttribute('title', "Plus d'actions");
    await expect(
      overflow.locator('.lucide-ellipsis-vertical.presentation-action-icon'),
    ).toBeVisible();
    await expect(page.getByText('Échec E2E visible', { exact: true })).toHaveCount(0);
  });

  test('failed builds preserve status, timestamp, and technical detail through the document API', async ({
    page,
  }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.failedBuildPresentationId}`);
    await expect(page.locator('input[name="title"]')).toHaveValue('E2E Failed Build Presentation');
    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.failedBuildPresentationId);
    expect(stored.status).toBe(200);
    expect(stored.body).toMatchObject({
      artifacts: [],
      lastBuildError: 'Échec E2E visible\nDétail technique déterministe',
      lastBuildRequestedAt: '2026-09-08T12:00:00.000Z',
      lastBuildStatus: 'failed',
    });
  });
});
