/**
 * Assemble + seed the "Gérer la PI dans une entreprise d'innovation" deck from
 * the modular slide files in `./slides`.
 *
 * Run from the slides/ repo root with env loaded:
 *   pnpm dlx tsx --env-file=.env scripts/seed-pi/assemble.ts
 *   pnpm dlx tsx --env-file=.env scripts/seed-pi/assemble.ts --force   # if DATABASE_URL contains "prod"
 *
 * Idempotent: upserts the presentation by slug. On write, the
 * afterPresentationChange hook queues a `buildSlides` job — run `pnpm jobs:run`
 * to produce the SPA + PDF.
 *
 * Slide order = lexical sort of the filenames in ./slides (3-digit numeric
 * prefixes, gaps of 10). Each file default-exports a SlideFactory.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical';
import config from '@payload-config';
import { getPayload } from 'payload';

import type { Slide, SlideCtx, SlideFactory } from './types';

const SLUG = 'gerer-la-pi-entreprise-innovation';
const TITLE = "Gérer la PI dans une entreprise d'innovation";
// Required relationship carrying the graphic charter. Defaults to Klarc (id 1);
// override with SEED_PI_ORG_ID.
const ORGANISATION_ID = Number(process.env.SEED_PI_ORG_ID ?? 1);

// Production safety: refuse to seed prod without --force.
if (process.env.DATABASE_URL?.toLowerCase().includes('prod') && !process.argv.includes('--force')) {
  console.error(
    'Refusing to seed: DATABASE_URL appears to point to production. Re-run with --force to override.',
  );
  process.exit(1);
}

async function main() {
  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.default({ config: payload.config });
  const rt = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown }) as never;
  const ctx: SlideCtx = { rt };

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const slidesDir = join(__dirname, 'slides');
  const files = readdirSync(slidesDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();

  const slides: Slide[] = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(slidesDir, file)).href);
    const factory = mod.default as SlideFactory | undefined;
    if (typeof factory !== 'function') {
      console.warn(`  skip ${file}: no default-exported factory function`);
      continue;
    }
    const out = factory(ctx);
    const arr = Array.isArray(out) ? out : [out];
    slides.push(...arr);
    console.log(`  ${file} → ${arr.length} slide(s)`);
  }
  console.log(`\nAssembled ${slides.length} slides from ${files.length} file(s).`);

  const existing = await payload.find({
    collection: 'presentations',
    where: { slug: { equals: SLUG } },
    limit: 1,
    overrideAccess: true,
  });

  const data = {
    slug: SLUG,
    title: TITLE,
    status: 'published' as const,
    organisation: ORGANISATION_ID,
    slides,
  };

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await payload.update({
      collection: 'presentations',
      id,
      data: data as any,
      overrideAccess: true,
    });
    console.log(`Updated presentation ${SLUG} (id ${id}) with ${slides.length} slides.`);
  } else {
    const created = await payload.create({
      collection: 'presentations',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      overrideAccess: true,
    });
    console.log(`Created presentation ${SLUG} (id ${created.id}) with ${slides.length} slides.`);
  }

  console.log('\nA buildSlides job has been queued. Run `pnpm jobs:run` to build the SPA + PDF.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
