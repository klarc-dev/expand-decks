import config from '@payload-config';
import { getPayload } from 'payload';

import { runBuildSlidesTask } from '../src/jobs/buildSlidesRunner';

async function main() {
  const payload = await getPayload({ config });
  // Boot Payload with NODE_ENV=production to avoid dev schema push, then restore
  // development for the child Slidev CLI. Slidev export times out locally when
  // inherited NODE_ENV=production on this branch.
  process.env.NODE_ENV = 'development';
  const result = await runBuildSlidesTask({
    input: { presentationId: '15' },
    req: { payload },
  } as never);
  console.log(JSON.stringify(result, null, 2));
  const updated = await payload.findByID({
    collection: 'presentations',
    id: 15,
    depth: 0,
  });
  console.log(
    JSON.stringify(
      {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        spaUrl: updated.spaUrl,
        pdfFile: updated.pdfFile,
        lastBuildStatus: updated.lastBuildStatus,
        lastBuildError: updated.lastBuildError,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
