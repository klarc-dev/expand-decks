/**
 * FULL-PIPELINE e2e — drives the agentic deck builder through the real admin UI
 * with EVERY feature enabled: source-aware research (any configured MCP/HTTP
 * sources), visual critique on the real Slidev render, and slide persistence.
 *
 * This is a LIVE test: gather → structure → draft → validate → visual → persist
 * hits the 9router gateway and shells out to Slidev/Chromium, so it is opt-in
 * and slow (several minutes). Enable with:
 *
 *   RUN_LIVE_AGENT_E2E=1 pnpm test:e2e tests/e2e/agent-pipeline.spec.ts
 *
 * Requires a running stack with OPENAI_API_KEY + DB seeded (SEED_ADMIN_*). To
 * exercise the source path, set AGENT_SOURCE_REGISTRY_JSON before booting the
 * server — the test selects whatever sources the registry exposes and asserts
 * they were used. With no registry it still covers the full content + visual
 * pipeline (just with zero sources).
 */
import { expect, test } from '@playwright/test';
import { getPayload } from 'payload';

import config from '../../src/payload.config';
import { COLLECTIONS } from '../../src/lib/collections';
import { DRAFT_STATUS } from '../../src/lib/status';

const live = process.env.RUN_LIVE_AGENT_E2E === '1' && !!process.env.OPENAI_API_KEY;

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

const slug = 'e2e-agent-pipeline';
const BRIEF =
  "Webinaire de 45 minutes pour des juristes d'entreprise : comment rendre une présentation d'expert juridique réellement intéressante. Mène par la conclusion (BLUF), réfute l'objection adverse, et ancre chaque point par un exemple concret.";

// The whole pipeline (LLM drafting + Slidev render + visual critique) runs well
// past Playwright's 30s default; give the slow path real headroom.
const PIPELINE_TIMEOUT_MS = 16 * 60 * 1000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

test.describe('agentic deck pipeline (live, all features enabled)', () => {
  test.skip(!live, 'Set RUN_LIVE_AGENT_E2E=1 and OPENAI_API_KEY to run the live pipeline e2e.');

  let presentationId: string;

  test.beforeAll(async () => {
    if (!email || !password) {
      throw new Error('Live pipeline e2e needs SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.');
    }
    const payload = await getPayload({ config });

    const { docs: users } = await payload.find({
      collection: COLLECTIONS.users,
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    });
    const user = users[0];
    if (!user) throw new Error(`Seed admin ${email} not found — boot the app once to seed it.`);

    const { docs: orgs } = await payload.find({
      collection: COLLECTIONS.organisations,
      where: { name: { equals: 'E2E Pipeline Org' } },
      limit: 1,
      overrideAccess: true,
    });
    const organisation =
      orgs[0] ??
      (await payload.create({
        collection: COLLECTIONS.organisations,
        data: { name: 'E2E Pipeline Org' },
        overrideAccess: true,
      } as never));

    const { docs: existing } = await payload.find({
      collection: COLLECTIONS.presentations,
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });

    // Start each run from a clean slate so slide-count / status assertions reflect
    // THIS run, not a previous one. Drop slides and reset the draft status.
    const data = {
      title: 'E2E Agent Pipeline',
      slug,
      language: 'fr' as const,
      status: 'draft' as const,
      organisation: organisation.id,
      createdBy: user.id,
      slides: [],
      draftStatus: DRAFT_STATUS.idle,
      draftEvents: [],
      draftSources: [],
      draftEvidence: [],
    };

    const presentation = existing[0]
      ? await payload.update({
          collection: COLLECTIONS.presentations,
          id: existing[0].id,
          data,
          overrideAccess: true,
          context: { skipBuildQueue: true },
        })
      : await payload.create({
          collection: COLLECTIONS.presentations,
          data,
          overrideAccess: true,
          context: { skipBuildQueue: true },
        });

    presentationId = String((presentation as { id: string | number }).id);
  });

  test('drafts, critiques, and persists a deck with all features on', async ({ page }) => {
    test.setTimeout(PIPELINE_TIMEOUT_MS);

    // ── Authenticate through the real admin login form ──────────────────────
    await page.goto('/admin/login');
    await page.locator('input[name="email"]').fill(email!);
    // JUSTIFIED: password value comes from SEED_ADMIN_PASSWORD; this literal is only the field selector.
    await page.locator('input[name="password"]').fill(password!);
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
      page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30_000 }),
      submitButton.click(),
    ]);
    await expect(page).not.toHaveURL(/\/login/);

    // The runtime source registry drives "all features": select every source the
    // server exposes (capped server-side). page.request shares the logged-in
    // session cookie, so this is the same view the panel fetches.
    const sourcesRes = await page.request.get('/api/agent-sources');
    expect(sourcesRes.ok()).toBeTruthy();
    const sourcesBody = (await sourcesRes.json()) as {
      sources: { id: string; label: string }[];
      maxSelected?: number;
    };
    const cap = sourcesBody.maxSelected ?? sourcesBody.sources.length;
    const expectedSourceIds = sourcesBody.sources.slice(0, cap).map((s) => s.id);

    // ── Open the presentation's IA tab ──────────────────────────────────────
    await page.goto(`/admin/collections/presentations/${presentationId}`);
    await page.getByRole('button', { name: 'IA', exact: true }).click();

    const brief = page.locator('#agent-brief');
    await expect(brief).toBeVisible();
    await brief.fill(BRIEF);

    // Visual critique is the heaviest feature and ON by default — assert it so a
    // future default flip doesn't silently downgrade this to a content-only run.
    const visualToggle = page.getByRole('checkbox', { name: /Critique visuelle/ });
    await expect(visualToggle).toBeChecked();

    // Tick each configured source so the gather/structure research path runs.
    for (const source of sourcesBody.sources.slice(0, cap)) {
      await page.getByRole('checkbox', { name: source.label }).check();
    }

    await page.getByRole('button', { name: 'Lancer le build agentique' }).click();

    // The run is fire-and-forget server-side; the doc's draftStatus is the source
    // of truth. Poll the authenticated REST surface until the run reaches a
    // terminal state (expect.poll, not a fixed sleep, so it finishes as soon as
    // the pipeline does).
    const readDoc = async () => {
      const res = await page.request.get(`/api/presentations/${presentationId}?depth=0`);
      expect(res.ok()).toBeTruthy();
      return res.json() as Promise<{
        draftStatus: string;
        slides?: unknown[];
        draftSources?: string[];
        draftEvidence?: unknown[];
      }>;
    };

    await expect
      .poll(async () => (await readDoc()).draftStatus, {
        timeout: POLL_TIMEOUT_MS,
        intervals: [3_000],
      })
      .toMatch(/^(done|failed)$/);

    // ── Verify the pipeline succeeded and persisted real output ──────────────
    const finalDoc = await readDoc();
    expect(finalDoc.draftStatus, 'pipeline should finish in done, not failed').toBe('done');
    expect(finalDoc.slides?.length ?? 0).toBeGreaterThan(0);

    // Sources are persisted as build metadata; what was selected must be recorded.
    expect([...(finalDoc.draftSources ?? [])].sort()).toEqual([...expectedSourceIds].sort());
    if (expectedSourceIds.length > 0) {
      expect(Array.isArray(finalDoc.draftEvidence)).toBeTruthy();
    }

    // The panel reflects completion to the author.
    await expect(page.getByText('Terminé.')).toBeVisible({ timeout: 30_000 });
  });
});
