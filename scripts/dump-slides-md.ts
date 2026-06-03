import { writeFileSync } from 'node:fs';

import { getPayload } from 'payload';
import config from '@payload-config';

import { buildSlidesMd } from '../src/export/buildSlidesMd';

const payload = await getPayload({ config });
const { docs } = await payload.find({
  collection: 'presentations',
  where: { slug: { equals: 'partenariats-r-d-bloom' } },
  limit: 1,
  depth: 2,
  overrideAccess: true,
});
if (!docs[0]) throw new Error('not found');
const md = buildSlidesMd(docs[0] as never);
writeFileSync('/tmp/dump-slides.md', md, 'utf-8');
console.log(`Wrote ${md.length} chars to /tmp/dump-slides.md`);
process.exit(0);
