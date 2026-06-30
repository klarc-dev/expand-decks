import { writeFileSync } from 'node:fs';

import { buildSlidesMd } from '../src/export/buildSlidesMd';
import { runPayloadScript } from './lib/payloadScript';

await runPayloadScript(async (payload) => {
  const doc = await payload.findByID({
    collection: 'presentations',
    id: 15,
    depth: 2,
    overrideAccess: true,
  });
  const md = buildSlidesMd(doc as never);
  writeFileSync('/tmp/p15-slides.md', md, 'utf-8');
  console.log(`Wrote ${md.length} chars to /tmp/p15-slides.md`);
});
