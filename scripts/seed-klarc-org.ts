/**
 * Seed: the "klarc" organisation with its logo.
 *
 * Idempotent: upserts a media doc for the klarc logomark (by filename) and the
 * "klarc" organisation (by name), then points the org's `logo` at that media.
 * Safe to re-run — reuses existing media/org instead of duplicating.
 *
 * Run from the slides/ repo root with DATABASE_URL exported:
 *   pnpm dlx tsx scripts/seed-klarc-org.ts
 *
 * The org's colours default to the klarc palette (#02585C / #F5A3B0 / …, which
 * is exactly what the logomark SVG uses), so only name + logo are set here.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPayload } from 'payload';
import config from '@payload-config';

const __filename = fileURLToPath(import.meta.url);
const LOGO_PATH = join(dirname(__filename), '..', 'public', 'brand', 'klarc-logomark.svg');
const LOGO_FILENAME = 'klarc-logomark.svg';
const ORG_NAME = 'klarc';

async function main() {
  const payload = await getPayload({ config });

  // 1) Upsert the logo media (idempotent by filename).
  const existingMedia = await payload.find({
    collection: 'media',
    where: { filename: { equals: LOGO_FILENAME } },
    limit: 1,
    overrideAccess: true,
  });

  let logoId: number | string;
  if (existingMedia.docs.length > 0) {
    logoId = existingMedia.docs[0]!.id;
    console.log(`Reusing media ${LOGO_FILENAME} (id ${logoId}).`);
  } else {
    const created = await payload.create({
      collection: 'media',
      data: { alt: 'Logo klarc' },
      filePath: LOGO_PATH,
      overrideAccess: true,
    });
    logoId = created.id;
    console.log(`Uploaded ${LOGO_FILENAME} → media id ${logoId}.`);
  }

  // 2) Upsert the klarc organisation (idempotent by name), pointing logo at it.
  const existingOrg = await payload.find({
    collection: 'organisations',
    where: { name: { equals: ORG_NAME } },
    limit: 1,
    overrideAccess: true,
  });

  if (existingOrg.docs.length > 0) {
    const id = existingOrg.docs[0]!.id;
    await payload.update({
      collection: 'organisations',
      id,
      data: { logo: logoId },
      overrideAccess: true,
    });
    console.log(`Updated organisation "${ORG_NAME}" (id ${id}) — logo set to media ${logoId}.`);
  } else {
    const created = await payload.create({
      collection: 'organisations',
      data: { name: ORG_NAME, logo: logoId },
      overrideAccess: true,
    });
    console.log(`Created organisation "${ORG_NAME}" (id ${created.id}) with logo media ${logoId}.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('seed-klarc-org failed:', err);
  process.exit(1);
});
