/**
 * Seed: the "klarc" organisation with its logo variants.
 *
 * Idempotent: upserts one media doc per logomark variant (by filename) and the
 * "klarc" organisation (by name, case-insensitive), then points the org's
 * `logo` (colour), `logoWhite` and `logoBlack` at those media docs. Safe to
 * re-run — reuses existing media/org instead of duplicating, and never
 * overwrites a logo variant the org already has.
 *
 * Run from the slides/ repo root with DATABASE_URL exported:
 *   pnpm dlx tsx scripts/seed-klarc-org.ts
 *
 * The org's colours default to the klarc palette (#02585C / #F5A3B0 / …, which
 * is exactly what the colour logomark SVG uses), so only name + logos are set
 * here. The white and black SVGs are the same paths with a flat fill; the deck
 * template shows the colour one on paper and the white one on dark slides.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPayload } from 'payload';
import config from '@payload-config';

import type { Organisation } from '../src/payload-types';

const __filename = fileURLToPath(import.meta.url);
const BRAND_DIR = join(dirname(__filename), '..', 'public', 'brand');
const ORG_NAME = 'klarc';

const LOGO_VARIANTS = [
  { field: 'logo', filename: 'klarc-logomark.svg', alt: 'Logo klarc' },
  { field: 'logoWhite', filename: 'klarc-logomark-white.svg', alt: 'Logo klarc (blanc)' },
  { field: 'logoBlack', filename: 'klarc-logomark-black.svg', alt: 'Logo klarc (noir)' },
] as const;

type LogoField = (typeof LOGO_VARIANTS)[number]['field'];

async function main() {
  const payload = await getPayload({ config });

  // 1) Upsert one media doc per logo variant (idempotent by filename).
  const logos = {} as Record<LogoField, number>;
  for (const variant of LOGO_VARIANTS) {
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: variant.filename } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      logos[variant.field] = existing.docs[0]!.id;
      console.log(`Reusing media ${variant.filename} (id ${logos[variant.field]}).`);
    } else {
      const created = await payload.create({
        collection: 'media',
        data: { alt: variant.alt },
        filePath: join(BRAND_DIR, variant.filename),
        overrideAccess: true,
      });
      logos[variant.field] = created.id;
      console.log(`Uploaded ${variant.filename} → media id ${created.id}.`);
    }
  }

  // 2) Upsert the klarc organisation, pointing the missing logos at the media.
  // Case-insensitive match: the admin-created org is "Klarc", the seed name
  // "klarc"; `like` is ILIKE on Postgres, the exact filter drops "klarc-x".
  const candidates = await payload.find({
    collection: 'organisations',
    where: { name: { like: ORG_NAME } },
    limit: 10,
    overrideAccess: true,
  });
  const org = candidates.docs.find(
    (doc) => doc.name.trim().toLowerCase() === ORG_NAME.toLowerCase(),
  );

  if (org) {
    // Only fill variants the org has not set yet: a logo chosen by hand in the
    // admin (e.g. a tiled "on white" colour version) must survive a re-seed.
    const missing = Object.fromEntries(
      LOGO_VARIANTS.filter((variant) => org[variant.field] == null).map((variant) => [
        variant.field,
        logos[variant.field],
      ]),
    ) as Partial<Record<LogoField, number>>;
    if (Object.keys(missing).length === 0) {
      console.log(`Organisation "${org.name}" (id ${org.id}) already has every logo variant.`);
    } else {
      await payload.update({
        collection: 'organisations',
        id: org.id,
        data: missing,
        overrideAccess: true,
      });
      console.log(
        `Updated organisation "${org.name}" (id ${org.id}) — set ${JSON.stringify(missing)}.`,
      );
    }
  } else {
    // Colour + font fields are `required` but carry defaultValues, so Payload
    // fills them at create time; the generated type still lists them as
    // required, hence the cast for this name+logos-only seed.
    const created = await payload.create({
      collection: 'organisations',
      data: { name: ORG_NAME, ...logos } as Partial<Organisation> as Organisation,
      overrideAccess: true,
    });
    console.log(
      `Created organisation "${ORG_NAME}" (id ${created.id}) with logos ${JSON.stringify(logos)}.`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('seed-klarc-org failed:', err);
  process.exit(1);
});
