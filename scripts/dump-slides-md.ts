/**
 * Dump a presentation's rendered slides.md (the exact string handed to Slidev).
 *
 *   pnpm deck:dump <idOrSlug> [outFile]
 *
 * Accepts a numeric presentation id or a slug. Defaults to
 * /tmp/<slug>.slides.md when no output path is given.
 */
import { writeFileSync } from 'node:fs';

import { buildSlidesMd } from '../src/export/buildSlidesMd';
import { runPayloadScript } from './lib/payloadScript';

const ref = process.argv[2];
if (!ref) {
  console.error('Usage: pnpm deck:dump <idOrSlug> [outFile]');
  process.exit(1);
}

await runPayloadScript(async (payload) => {
  const doc = /^\d+$/.test(ref)
    ? await payload.findByID({
        collection: 'presentations',
        id: ref,
        depth: 2,
        overrideAccess: true,
      })
    : (
        await payload.find({
          collection: 'presentations',
          where: { slug: { equals: ref } },
          limit: 1,
          depth: 2,
          overrideAccess: true,
        })
      ).docs[0];

  if (!doc) throw new Error(`Presentation not found: ${ref}`);

  const md = buildSlidesMd(doc as never);
  const out = process.argv[3] ?? `/tmp/${doc.slug}.slides.md`;
  writeFileSync(out, md, 'utf-8');
  console.log(`Wrote ${md.length} chars to ${out}`);
});
