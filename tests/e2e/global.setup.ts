import { expect, test as setup } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { getPayload } from 'payload';

import { ROLES } from '../../src/access/roles';
import { COLLECTIONS } from '../../src/lib/collections';
import { patchPresentationBuildMetadata } from '../../src/jobs/patchPresentationBuildMetadata';
import config from '../../src/payload.config';

export const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
export const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
export const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
export const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

export type E2EFixtures = {
  agentRunId: string;
  adminMediaId: string;
  authorId: string;
  buildPresentationId: string;
  failedBuildPresentationId: string;
  successfulBuildPresentationId: string;
  emptyKnowledgeBaseId: string;
  uiKnowledgeBaseId: string;
  foreignOrganisationId: string;
  foreignPresentationId: string;
  knowledgeBaseId: string;
  knowledgeDocumentId: string;
  organisationId: string;
  presentationId: string;
  slideCrudPresentationId: string;
  spaPresentationId: string;
  uiPresentationId: string;
  viewerId: string;
};

const credentials = {
  admin: {
    email: 'e2e-admin@expand.local',
    password: 'E2e-admin-password-4317',
    role: ROLES.admin,
  },
  author: {
    email: 'e2e-author@expand.local',
    password: 'E2e-author-password-4317',
    role: ROLES.author,
  },
  viewer: {
    email: 'e2e-viewer@expand.local',
    password: 'E2e-viewer-password-4317',
    role: ROLES.viewer,
  },
} as const;

async function upsertUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: (typeof credentials)[keyof typeof credentials],
) {
  const existing = await payload.find({
    collection: COLLECTIONS.users,
    where: { email: { equals: user.email } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const data = { password: user.password, role: user.role, membershipStatus: 'active' as const };
  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: COLLECTIONS.users,
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
    return updated;
  }
  const created = await payload.create({
    collection: COLLECTIONS.users,
    data: { email: user.email, ...data },
    overrideAccess: true,
  });
  return created;
}

async function login(
  page: import('@playwright/test').Page,
  user: (typeof credentials)[keyof typeof credentials],
  authFile: string,
) {
  await page.goto('/admin/login');
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/admin\/login/);
  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
}

setup('seed deterministic users and authenticate roles', async ({ browser }) => {
  setup.setTimeout(120_000);

  const payload = await getPayload({ config });
  const seededUsers = await Promise.all(
    Object.values(credentials).map((user) => upsertUser(payload, user)),
  );
  const [admin, author, viewer] = seededUsers;
  if (!admin || !author || !viewer) throw new Error('Failed to seed E2E users.');

  const organisation = await payload.create({
    collection: COLLECTIONS.organisations,
    data: {
      name: 'E2E Member Organisation',
      createdBy: admin.id,
      primary: '#02585C',
      secondary: '#F5A3B0',
      ink: '#0F2A2B',
      paper: '#FAFBFB',
      headingFont: 'Gilroy',
      bodyFont: 'Roboto',
    },
    overrideAccess: true,
  });
  const foreignOrganisation = await payload.create({
    collection: COLLECTIONS.organisations,
    data: {
      name: 'E2E Foreign Organisation',
      createdBy: admin.id,
      primary: '#02585C',
      secondary: '#F5A3B0',
      ink: '#0F2A2B',
      paper: '#FAFBFB',
      headingFont: 'Gilroy',
      bodyFont: 'Roboto',
    },
    overrideAccess: true,
  });

  for (const user of [author, viewer]) {
    await payload.update({
      collection: COLLECTIONS.users,
      id: user.id,
      data: { organisations: [organisation.id], defaultOrganisation: organisation.id },
      overrideAccess: true,
    });
  }

  const knowledgeBase = await payload.create({
    collection: COLLECTIONS.knowledgeBases,
    data: {
      name: 'E2E Knowledge Base',
      organisation: organisation.id,
      createdBy: author.id,
    },
    overrideAccess: true,
    user: admin,
  });

  const emptyKnowledgeBase = await payload.create({
    collection: COLLECTIONS.knowledgeBases,
    data: {
      name: 'E2E Empty Knowledge Base',
      organisation: organisation.id,
      createdBy: author.id,
    },
    overrideAccess: true,
    user: admin,
  });

  const uiKnowledgeBase = await payload.create({
    collection: COLLECTIONS.knowledgeBases,
    data: {
      name: 'E2E UI Document Knowledge Base',
      organisation: organisation.id,
      createdBy: author.id,
    },
    overrideAccess: true,
    user: admin,
  });

  const adminMedia = await payload.create({
    collection: COLLECTIONS.media,
    data: { alt: 'E2E admin editable media' },
    file: {
      data: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
      mimetype: 'image/png',
      name: 'e2e-admin-media.png',
      size: 68,
    },
    overrideAccess: true,
    user: admin,
  });

  const knowledgeDocument = await payload.create({
    collection: COLLECTIONS.knowledgeDocuments,
    data: { knowledgeBase: knowledgeBase.id, indexingStatus: 'pending' },
    file: {
      data: Buffer.from('Knowledge grounded by a deterministic E2E fixture.'),
      mimetype: 'text/plain',
      name: 'e2e-knowledge.txt',
      size: 52,
    },
    overrideAccess: true,
    user: admin,
    context: { skipIngestQueue: true },
  });

  const presentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Member Presentation',
      slug: 'e2e-member-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  const slideCrudPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Slide CRUD Presentation',
      slug: 'e2e-slide-crud-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const buildPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Build Presentation',
      slug: 'e2e-build-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const failedBuildPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Failed Build Presentation',
      slug: 'e2e-failed-build-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
      lastBuildStatus: 'failed',
      lastBuildError: 'Échec E2E visible\nDétail technique déterministe',
      lastBuildRequestedAt: '2026-09-08T12:00:00.000Z',
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  await patchPresentationBuildMetadata(payload, String(failedBuildPresentation.id), {
    lastBuildStatus: 'failed',
    lastBuildError: 'Échec E2E visible\nDétail technique déterministe',
    lastBuildRequestedAt: '2026-09-08T12:00:00.000Z',
  });

  const successfulBuildPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Successful Build Presentation',
      slug: 'e2e-successful-build-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'published',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  const successfulBuildPdfData = Buffer.from(
    'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgNiAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNCAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDYgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9BdXRob3IgKGFub255bW91cykgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDkwOTAyMzQzNiswMicwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDkwOTAyMzQzNiswMicwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlICh1bnRpdGxlZCkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9Db3VudCAxIC9LaWRzIFsgMyAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMTA5Cj4+CnN0cmVhbQpHYXBRaDBFPUYsMFVcSDNUXHBOWVReUUtrP3RjPklQLDtXI1UxXjIzaWhQRU1fP0NXNEtJU2k8IVs3YCNPQl9xdT0hTGUjb1tMUCdVO1c1RSdTUU4nMmJmIWYvOzRXZU86REZIIS5aLipEdX4+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDA5MiAwMDAwMCBuIAowMDAwMDAwMTk5IDAwMDAwIG4gCjAwMDAwMDA0MDIgMDAwMDAgbiAKMDAwMDAwMDQ3MCAwMDAwMCBuIAowMDAwMDAwNzMxIDAwMDAwIG4gCjAwMDAwMDA3OTAgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8NTY4Njc1Nzc0MzhkYzYyMWM4YmYxYjlkOTc4MTE1YWE+PDU2ODY3NTc3NDM4ZGM2MjFjOGJmMWI5ZDk3ODExNWFhPl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA1IDAgUgovUm9vdCA0IDAgUgovU2l6ZSA4Cj4+CnN0YXJ0eHJlZgo5ODkKJSVFT0YK',
    'base64',
  );
  const successfulBuildPdf = await payload.create({
    collection: COLLECTIONS.media,
    data: {
      alt: 'PDF E2E généré',
      presentation: successfulBuildPresentation.id,
    },
    file: {
      data: successfulBuildPdfData,
      mimetype: 'application/pdf',
      name: 'e2e-successful-build.pdf',
      size: successfulBuildPdfData.byteLength,
    },
    overrideAccess: true,
    user: admin,
  });
  await patchPresentationBuildMetadata(payload, String(successfulBuildPresentation.id), {
    lastBuildStatus: 'success',
    lastBuildError: null,
    lastBuildRequestedAt: '2026-09-08T13:00:00.000Z',
    spaUrl: '/spa/e2e-successful-build-presentation/index.html',
    pdfFile: successfulBuildPdf.id,
  });

  const spaPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E SPA Presentation',
      slug: 'e2e-spa-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const uiPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E UI Presentation',
      slug: 'e2e-ui-presentation',
      organisation: organisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const foreignPresentation = await payload.create({
    collection: COLLECTIONS.presentations,
    data: {
      title: 'E2E Foreign Presentation',
      slug: 'e2e-foreign-presentation',
      organisation: foreignOrganisation.id,
      language: 'fr',
      status: 'draft',
      slides: [],
    },
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });

  const agentRunId = 'e2e-agent-run';
  const existingAgentRuns = await payload.find({
    collection: COLLECTIONS.agentRuns,
    where: { mastraRunId: { equals: agentRunId } },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  });
  await Promise.all(
    existingAgentRuns.docs.map((agentRun) =>
      payload.delete({
        collection: COLLECTIONS.agentRuns,
        id: agentRun.id,
        overrideAccess: true,
      }),
    ),
  );
  await payload.create({
    collection: COLLECTIONS.agentRuns,
    data: {
      presentation: presentation.id,
      createdBy: author.id,
      organisation: organisation.id,
      mastraRunId: agentRunId,
      requestId: 'e2e-agent-request',
      traceId: 'e2e-agent-trace',
      status: 'succeeded',
      phase: 'complete',
      command: 'start',
      mode: 'replace',
      brief: 'Deterministic E2E agent run',
      language: 'fr',
      visual: false,
      approvalRequired: false,
      sourcePolicy: 'none',
      sourceIds: [],
      inputFingerprint: 'e2e-agent-fingerprint',
      events: [{ ts: 1, phase: 'complete' }],
      heartbeatAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    overrideAccess: true,
    user: admin,
  });

  await rm(resolve('media/spa/e2e-spa-presentation'), { recursive: true, force: true });
  await mkdir(resolve('media/spa/e2e-spa-presentation/assets'), { recursive: true });
  await writeFile(
    resolve('media/spa/e2e-spa-presentation/index.html'),
    '<!doctype html><html><body><h1>E2E built deck</h1><script src="/spa/e2e-spa-presentation/assets/app.js"></script></body></html>',
  );
  await writeFile(
    resolve('media/spa/e2e-spa-presentation/assets/app.js'),
    'window.__E2E_DECK_LOADED__ = true;',
  );

  const fixtures: E2EFixtures = {
    agentRunId,
    adminMediaId: String(adminMedia.id),
    authorId: String(author.id),
    buildPresentationId: String(buildPresentation.id),
    failedBuildPresentationId: String(failedBuildPresentation.id),
    successfulBuildPresentationId: String(successfulBuildPresentation.id),
    emptyKnowledgeBaseId: String(emptyKnowledgeBase.id),
    uiKnowledgeBaseId: String(uiKnowledgeBase.id),
    foreignOrganisationId: String(foreignOrganisation.id),
    foreignPresentationId: String(foreignPresentation.id),
    knowledgeBaseId: String(knowledgeBase.id),
    knowledgeDocumentId: String(knowledgeDocument.id),
    organisationId: String(organisation.id),
    presentationId: String(presentation.id),
    slideCrudPresentationId: String(slideCrudPresentation.id),
    spaPresentationId: String(spaPresentation.id),
    uiPresentationId: String(uiPresentation.id),
    viewerId: String(viewer.id),
  };
  await mkdir(dirname(E2E_FIXTURES_FILE), { recursive: true });
  await writeFile(E2E_FIXTURES_FILE, JSON.stringify(fixtures));

  for (const [role, authFile] of [
    ['admin', E2E_ADMIN_AUTH_FILE],
    ['author', E2E_AUTHOR_AUTH_FILE],
    ['viewer', E2E_VIEWER_AUTH_FILE],
  ] as const) {
    const context = await browser.newContext();
    await login(await context.newPage(), credentials[role], authFile);
    await context.close();
  }
});
