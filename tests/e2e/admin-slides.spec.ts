import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { uiPresentationId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

test.describe('Payload slide-block authoring UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author adds, edits, and saves a section slide through the block editor', async ({
    page,
  }) => {
    const data = await fixtures();
    await page.goto(`/admin/collections/presentations/${data.uiPresentationId}`);

    await page.getByRole('button', { name: /add slide/i }).click();
    await page.getByText('Section', { exact: true }).click();

    const number = page.locator('input[name="slides.0.number"]');
    const title = page.locator('input[name="slides.0.title"]');
    await expect(number).toBeVisible();
    await expect(title).toBeVisible();
    await number.fill('01');
    await title.fill('E2E UI Section');

    const firstSave = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/presentations/${data.uiPresentationId}`) &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await firstSave;

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[name="slides.0.number"]')).toHaveValue('01');
    await expect(page.locator('input[name="slides.0.title"]')).toHaveValue('E2E UI Section');

    await page.getByRole('button', { name: /add slide/i }).click();
    await page.getByText('Section', { exact: true }).click();
    await page.locator('input[name="slides.1.number"]').fill('02');
    await page.locator('input[name="slides.1.title"]').fill('E2E UI Section Second');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/successfully|succès|mise à jour/i).first()).toBeVisible();

    await page.locator('input[name="slides.0.title"]').fill('E2E UI Section Updated');
    const updated = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/presentations/${data.uiPresentationId}`) &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await updated;

    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/presentations/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, data.uiPresentationId);
    expect(stored.status).toBe(200);
    expect(stored.body.slides).toHaveLength(2);
    expect(stored.body.slides[0]).toMatchObject({
      blockType: 'section',
      number: '01',
      title: 'E2E UI Section Updated',
    });
    expect(stored.body.slides[1]).toMatchObject({
      blockType: 'section',
      number: '02',
      title: 'E2E UI Section Second',
    });
  });
});
