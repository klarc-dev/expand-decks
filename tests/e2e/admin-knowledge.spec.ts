import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { uiKnowledgeBaseId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

test.describe('Payload knowledge-base authoring UI', () => {
  test.use({ storageState: E2E_AUTHOR_AUTH_FILE });

  test('author creates and edits a knowledge base with the sole organisation preselected', async ({
    page,
  }) => {
    await page.goto('/admin/collections/knowledge-bases/create');

    const name = page.locator('input[name="name"]');
    await expect(name).toBeVisible();
    await expect(page.getByText('E2E Member Organisation', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/required|obligatoire|champ/i).first()).toBeVisible();

    await name.fill('E2E UI Knowledge Base');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/successfully|succès|créé/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/collections\/knowledge-bases\/[^/]+$/);

    const id = new URL(page.url()).pathname.split('/').pop();
    expect(id).toBeTruthy();

    await page.locator('input[name="name"]').fill('E2E UI Knowledge Base Updated');
    const updated = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/knowledge-bases/${id}`) &&
        response.request().method() === 'PATCH' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await updated;

    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue('E2E UI Knowledge Base Updated');
    await expect(page.getByText('E2E Member Organisation', { exact: true })).toBeVisible();

    const stored = await page.evaluate(async (knowledgeBaseId) => {
      const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, id);
    expect(stored.status).toBe(200);
    expect(stored.body.name).toBe('E2E UI Knowledge Base Updated');
    expect(stored.body.organisation).toBeTruthy();
  });

  test('author uploads a text document through the real admin form', async ({ page }) => {
    const data = await fixtures();
    await page.goto('/admin/collections/knowledge-documents/create');

    const file = page.locator('input[type="file"]');
    await expect(file).toBeAttached();
    await file.setInputFiles({
      name: 'e2e-ui-knowledge.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Knowledge uploaded through the Payload admin UI.'),
    });

    // Payload's relationship select currently exposes an unnamed combobox; the
    // first combobox is the editable Base field and the second is read-only status.
    const base = page.getByRole('combobox').first();
    await expect(base).toBeVisible();
    await base.click();
    await page.getByText('E2E UI Document Knowledge Base', { exact: true }).click();

    const created = page.waitForResponse(
      (response) =>
        response.url().includes('/api/knowledge-documents') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const response = await created;
    const result = await response.json();
    const documentId = String(result.doc?.id ?? result.id);
    expect(documentId).not.toBe('undefined');

    await expect(page).toHaveURL(
      new RegExp(`/admin/collections/knowledge-documents/${documentId}$`),
    );
    await expect(page.getByText(/e2e-ui-knowledge(?:-\d+)?\.txt/i).first()).toBeVisible();

    const stored = await page.evaluate(async (id) => {
      const response = await fetch(`/api/knowledge-documents/${id}?depth=0`);
      return { body: await response.json(), status: response.status };
    }, documentId);
    expect(stored.status).toBe(200);
    expect(stored.body.filename).toMatch(/^e2e-ui-knowledge(?:-\d+)?\.txt$/);
    expect(String(stored.body.knowledgeBase)).toBe(data.uiKnowledgeBaseId);
    expect(stored.body.mimeType).toBe('text/plain');
    expect(stored.body.indexingStatus).toBe('pending');
  });
});
