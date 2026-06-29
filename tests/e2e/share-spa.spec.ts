import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';
import { getPayload } from 'payload';

import config from '../../src/payload.config';
import { COLLECTIONS } from '../../src/lib/collections';
import { sha256 } from '../../src/lib/shareLinks';
import { spaDir } from '../../src/lib/paths';

const slug = 'e2e-share-spa';
const token = 'e2e-share-spa-token';

test.beforeAll(async () => {
  const payload = await getPayload({ config });

  const { docs: users } = await payload.find({
    collection: COLLECTIONS.users,
    limit: 1,
    overrideAccess: true,
  });
  const user = users[0];
  if (!user) throw new Error('E2E needs one seeded user. Set SEED_ADMIN_EMAIL/PASSWORD.');

  const { docs: orgs } = await payload.find({
    collection: COLLECTIONS.organisations,
    where: { name: { equals: 'E2E Share SPA Org' } },
    limit: 1,
    overrideAccess: true,
  });
  const organisation =
    orgs[0] ??
    (await payload.create({
      collection: COLLECTIONS.organisations,
      data: { name: 'E2E Share SPA Org' },
      overrideAccess: true,
    } as never));

  const { docs: presentations } = await payload.find({
    collection: COLLECTIONS.presentations,
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });

  const presentationData = {
    title: 'E2E Share SPA',
    slug,
    language: 'fr',
    status: 'published',
    organisation: organisation.id,
    createdBy: user.id,
  } as const;
  const presentation = presentations[0]
    ? await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentations[0].id,
        data: presentationData,
        overrideAccess: true,
        context: { skipBuildQueue: true },
      })
    : await payload.create({
        collection: COLLECTIONS.presentations,
        data: presentationData,
        overrideAccess: true,
        context: { skipBuildQueue: true },
      });

  const { docs: links } = await payload.find({
    collection: COLLECTIONS.shareLinks,
    where: { tokenHash: { equals: sha256(token) } },
    limit: 1,
    overrideAccess: true,
  });
  const linkData = {
    presentation: presentation.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdBy: user.id,
  };
  if (links[0]) {
    await payload.update({
      collection: COLLECTIONS.shareLinks,
      id: links[0].id,
      data: linkData,
      overrideAccess: true,
    });
  } else {
    const created = await payload.create({
      collection: COLLECTIONS.shareLinks,
      data: linkData,
      overrideAccess: true,
    });
    await payload.update({
      collection: COLLECTIONS.shareLinks,
      id: created.id,
      data: { tokenHash: sha256(token) },
      overrideAccess: true,
    });
  }

  const root = spaDir(slug);
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(
    join(root, 'index.html'),
    '<!doctype html><title>E2E Deck</title><main id="app">Shared deck loaded</main>',
  );
  await writeFile(join(root, 'assets', 'deck.js'), 'window.__E2E_DECK__ = true;');
});

test('share page renders public iframe and increments view count', async ({ page }) => {
  const payload = await getPayload({ config });
  const before = await payload.find({
    collection: COLLECTIONS.shareLinks,
    where: { tokenHash: { equals: sha256(token) } },
    limit: 1,
    overrideAccess: true,
  });
  const beforeCount = before.docs[0]?.viewCount ?? 0;

  await page.goto(`/share/${token}`);
  await expect(page.frameLocator('iframe').locator('#app')).toHaveText('Shared deck loaded');

  const after = await payload.find({
    collection: COLLECTIONS.shareLinks,
    where: { tokenHash: { equals: sha256(token) } },
    limit: 1,
    overrideAccess: true,
  });
  expect(after.docs[0]?.viewCount).toBeGreaterThan(beforeCount);
  expect(after.docs[0]?.lastViewedAt).toBeTruthy();
});

test('share SPA serves index, assets, missing files, and blocks traversal', async ({ page }) => {
  const index = await page.request.get(`/share/${token}/spa`);
  expect(index.status()).toBe(200);
  expect(await index.text()).toContain('Shared deck loaded');

  const asset = await page.request.get(`/share/${token}/spa/assets/deck.js`);
  expect(asset.status()).toBe(200);
  expect(asset.headers()['content-type']).toContain('application/javascript');

  const missing = await page.request.get(`/share/${token}/spa/missing.js`);
  expect(missing.status()).toBe(404);

  const traversal = await page.request.get(`/share/${token}/spa/%2e%2e/index.html`);
  expect([403, 404]).toContain(traversal.status());
});

test('invalid share tokens are rejected', async ({ page }) => {
  await page.goto('/share/not-a-token');
  await expect(page.getByRole('heading', { name: 'Lien invalide' })).toBeVisible();

  const spa = await page.request.get('/share/not-a-token/spa');
  expect(spa.status()).toBe(403);
});
