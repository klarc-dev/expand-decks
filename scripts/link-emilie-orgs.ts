/**
 * One-off: provision the two brand organisations and grant Emilie membership.
 *
 * Brand values are the live sites' own CSS design tokens (--ef-color-* /
 * --ef-family-*), not approximations.
 *
 *   NODE_ENV=development pnpm tsx --env-file-if-exists=.env scripts/link-emilie-orgs.ts
 *
 * Idempotent: orgs are matched by name and patched rather than duplicated, and
 * membership is a set union, so re-running is a no-op.
 */
import { COLLECTIONS } from '../src/lib/collections';
import { runPayloadScript, type ScriptPayload } from './lib/payloadScript';

const EMILIE = 'emilie@pipeline-finder.com';

const ORGS = [
  {
    name: 'best-matcha.com',
    primary: '#067800',
    secondary: '#992AA6',
    ink: '#1C2024',
    paper: '#FFFFFF',
    headingFont: 'Poppins',
    bodyFont: 'IBM Plex Sans',
  },
  {
    name: 'cosmetic-labs.com',
    primary: '#FFA200',
    secondary: '#0B8A2B',
    ink: '#121517',
    paper: '#FFFFFF',
    headingFont: 'Inter',
    bodyFont: 'Inter',
  },
] as const;

async function upsertOrg(payload: ScriptPayload, data: (typeof ORGS)[number]) {
  const existing = await payload.find({
    collection: COLLECTIONS.organisations,
    where: { name: { equals: data.name } },
    depth: 0,
    limit: 1,
  });

  const found = existing.docs[0];
  if (found) {
    const updated = await payload.update({
      collection: COLLECTIONS.organisations,
      id: String(found.id),
      data,
    });
    console.log(`updated organisation ${data.name} (id ${updated.id})`);
    return updated;
  }

  const created = await payload.create({ collection: COLLECTIONS.organisations, data });
  console.log(`created organisation ${data.name} (id ${created.id})`);
  return created;
}

await runPayloadScript(async (payload) => {
  const users = await payload.find({
    collection: COLLECTIONS.users,
    where: { email: { equals: EMILIE } },
    depth: 0,
    limit: 1,
  });

  const emilie = users.docs[0];
  if (!emilie) throw new Error(`no user found for ${EMILIE}`);

  const orgs = [];
  for (const org of ORGS) orgs.push(await upsertOrg(payload, org));

  // Union with any existing membership so this never revokes access.
  const current = (emilie.organisations ?? []).map((o) =>
    typeof o === 'object' && o !== null ? o.id : o,
  );
  const organisations = [...new Set<number>([...current, ...orgs.map((o) => o.id)])];

  const bestMatcha = orgs.find((o) => o.name === 'best-matcha.com');

  const updated = await payload.update({
    collection: COLLECTIONS.users,
    id: String(emilie.id),
    data: { organisations, defaultOrganisation: bestMatcha?.id },
  });

  console.log(
    `linked ${EMILIE} (id ${emilie.id}) to organisations [${updated.organisations?.join(', ')}], default ${updated.defaultOrganisation}`,
  );
});
