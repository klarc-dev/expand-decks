import { runBuildSlidesTask } from '../src/jobs/buildSlidesRunner';
import { runPayloadScript } from './lib/payloadScript';

await runPayloadScript(async (payload) => {
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
});
