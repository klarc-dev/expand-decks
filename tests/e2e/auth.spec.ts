import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');

test.describe('authentication and admin authorization', () => {
  test('anonymous visitors are redirected to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('invalid credentials keep the visitor unauthenticated', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('input[name="email"]').fill('nobody@expand.local');
    await page.locator('input[name="password"]').fill('incorrect-password');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/incorrect|invalide|erreur/i)).toBeVisible();
  });

  for (const [role, storageState] of [
    ['admin', E2E_ADMIN_AUTH_FILE],
    ['author', E2E_AUTHOR_AUTH_FILE],
  ] as const) {
    test(`${role} can open the authenticated admin`, async ({ browser }) => {
      const context = await browser.newContext({ storageState });
      const page = await context.newPage();
      await page.goto('/admin');
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.locator('body')).toContainText(/Tableau de bord|Dashboard|Présentations/);
      await context.close();
    });
  }

  test('viewer is authenticated but denied access to the admin panel', async ({ browser }) => {
    const context = await browser.newContext({ storageState: E2E_VIEWER_AUTH_FILE });
    const page = await context.newPage();
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page.locator('body')).toContainText(/Unauthorized|not allowed|pas.*autorisé/i);
    await context.close();
  });
});
