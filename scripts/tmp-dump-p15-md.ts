import { writeFileSync } from 'node:fs';

import config from '@payload-config';
import { getPayload } from 'payload';

import { buildSlidesMd } from '../src/export/buildSlidesMd';

async function main() {
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    collection: 'presentations',
    id: 15,
    depth: 2,
    overrideAccess: true,
  });
  const md = buildSlidesMd(doc as never);
  writeFileSync('/tmp/p15-slides.md', md, 'utf-8');
  console.log(`Wrote ${md.length} chars to /tmp/p15-slides.md`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
