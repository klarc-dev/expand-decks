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
    const webLink = page.getByRole('link', { name: /ouvrir la présentation web/i });
    await expect(async () => {
      if (!(await webLink.isVisible())) {
        await page.getByRole('button', { name: 'Sortie', exact: true }).click();
      }
      await expect(webLink).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    const pdfLink = page.getByRole('link', { name: /télécharger le pdf/i });
    await expect(webLink).toHaveAttribute(
      'href',
      '/spa/e2e-successful-build-presentation/index.html',
    );
    await expect(webLink).toHaveAttribute('target', '_blank');
    await expect(pdfLink).toHaveAttribute(
      'href',
      /\/api\/media\/file\/e2e-successful-build(?:-\d+)?\.pdf$/,
    );
    await expect(pdfLink).toHaveAttribute('target', '_blank');
    await expect(page.getByText('Échec E2E visible', { exact: true })).toHaveCount(0);
  });

  test('failed builds show their status, summary, timestamp, and expandable technical detail', async ({
    page,
  }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.failedBuildPresentationId}`);
    await expect(page.locator('input[name="title"]')).toHaveValue('E2E Failed Build Presentation');
    await expect(async () => {
      await page.getByRole('button', { name: 'Sortie', exact: true }).click();
      await expect(page.getByText('Échec E2E visible', { exact: true })).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await expect(page.getByRole('term')).toHaveText('Demandé');
    await expect(page.getByRole('definition').getByRole('time')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Artefacts du build' })).toHaveCount(0);

    await page.locator('details').filter({ hasText: 'Afficher le détail technique' }).click();
    await expect(page.getByText(/Détail technique déterministe/)).toBeVisible();
  });
});
