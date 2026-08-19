/**
 * Generic deck build runner — builds the Slidev SPA + PDF for a presentation.
 *
 *   pnpm deck:build <presentationId>
 *
 * Runs the same buildSlides task as the queued job, but synchronously in this
 * process: renders slides.md, shells out to Slidev (build + PDF export),
 * uploads the PDF to media, copies the SPA to media/spa/<slug>/, and patches
 * the presentation's artifacts + lastBuildStatus. Requires the local DB and
 * the slidev-workspace dependencies (incl. Chromium) to be installed.
 */
import { runBuildSlidesTask, type BuildSlidesTaskArgs } from '../src/jobs/buildSlidesRunner';
import { runPayloadScript } from './lib/payloadScript';

const presentationId = process.argv[2];

if (!presentationId || !/^\d+$/.test(presentationId)) {
  console.error('Usage: pnpm deck:build <presentationId>');
  process.exit(1);
}

await runPayloadScript(async (payload) => {
  const args: BuildSlidesTaskArgs = {
    input: { presentationId },
    req: { payload },
  };
  await runBuildSlidesTask(args);

  const updated = await payload.findByID({
    collection: 'presentations',
    id: presentationId,
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
