/**
 * End-to-end verification — drives the REAL pipeline a user would:
 *   1. create a presentation (Payload local API),
 *   2. draft slides from the long brief via the real LLM,
 *   3. convert markdown → Lexical (as the route does),
 *   4. save the slides onto the presentation,
 *   5. run the ACTUAL buildSlidesTask handler → Slidev SPA + PDF,
 *   6. report the artifacts so the PDF can be verified.
 *
 *   node_modules/.bin/tsx --env-file=.env scripts/e2e-verify.mjs [briefFile]
 *
 * Reuses an existing drafted JSON at /tmp/draft-eval.json when present (set
 * REDRAFT=1 to force a fresh LLM draft) so the slow LLM pass isn't repeated on
 * every build iteration.
 */
import { readFileSync, existsSync } from 'node:fs';
import { getPayload } from 'payload';
import config from '../src/payload.config.ts';
import { draftPresentationSlides } from '../src/lib/draftPresentation.ts';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite.ts';
import { buildSlidesTask } from '../src/jobs/buildSlides.ts';

const briefFile = process.argv[2] ?? 'scripts/pi-brief.txt';
const SLUG = 'e2e-verify-pi';

const payload = await getPayload({ config });

// 1. Draft (reuse cached JSON unless forced).
let slides;
if (!process.env.REDRAFT && existsSync('/tmp/draft-eval.json')) {
  slides = JSON.parse(readFileSync('/tmp/draft-eval.json', 'utf8')).slides;
  console.log(`reusing /tmp/draft-eval.json — ${slides.length} slides (REDRAFT=1 to refresh)`);
} else {
  const brief = readFileSync(briefFile, 'utf8');
  console.log(`drafting ${briefFile} (${brief.length} chars) via LLM…`);
  ({ slides } = await draftPresentationSlides(brief));
  console.log(`drafted ${slides.length} slides`);
}

// 2. Convert markdown → Lexical, exactly as the route does.
const richSlides = await convertSlidesMarkdownToLexical(slides, payload);

// 3. Ensure an organisation exists (now a required relation on presentations).
const orgFound = await payload.find({
  collection: 'organisations',
  where: { name: { equals: 'E2E Org' } },
  limit: 1,
  overrideAccess: true,
});
const org =
  orgFound.docs[0] ??
  (await payload.create({
    collection: 'organisations',
    data: { name: 'E2E Org' },
    overrideAccess: true,
  }));
console.log(`organisation ${org.id} (${org.name})`);

// 4. Upsert a real presentation row with those slides.
const existing = await payload.find({
  collection: 'presentations',
  where: { slug: { equals: SLUG } },
  limit: 1,
  overrideAccess: true,
});

const data = {
  title: 'E2E — Webinaire PI',
  slug: SLUG,
  language: 'fr',
  status: 'draft',
  organisation: org.id,
  slides: richSlides,
};

let presentation;
if (existing.docs[0]) {
  presentation = await payload.update({
    collection: 'presentations',
    id: existing.docs[0].id,
    data,
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  console.log(`updated presentation ${presentation.id}`);
} else {
  presentation = await payload.create({
    collection: 'presentations',
    data,
    overrideAccess: true,
    context: { skipBuildQueue: true },
  });
  console.log(`created presentation ${presentation.id}`);
}

// 4. Run the REAL build job handler.
console.log('running buildSlidesTask…');
const t0 = Date.now();
const result = await buildSlidesTask.handler({
  input: { presentationId: String(presentation.id) },
  req: { payload },
});
console.log(
  `build handler returned in ${((Date.now() - t0) / 1000).toFixed(1)}s:`,
  JSON.stringify(result),
);

// 5. Re-read the presentation to report artifacts.
const final = await payload.findByID({
  collection: 'presentations',
  id: presentation.id,
  depth: 1,
  overrideAccess: true,
});
console.log('\n=== RESULT ===');
console.log('lastBuildStatus:', final.lastBuildStatus);
console.log('lastBuildError :', final.lastBuildError || '(none)');
console.log('spaUrl         :', final.spaUrl);
console.log(
  'pdfFile        :',
  final.pdfFile && typeof final.pdfFile === 'object' ? final.pdfFile.filename : final.pdfFile,
);

process.exit(final.lastBuildStatus === 'success' ? 0 : 1);
