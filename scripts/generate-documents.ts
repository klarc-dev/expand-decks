import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { DOCUMENT_TEMPLATE_FIXTURES, documentTemplateFixture } from '../src/documents/fixtures';
import { DOCUMENT_TEMPLATE_ID_SCHEMA, resolveDocumentTemplate } from '../src/documents/templates';
import { runBuildSlidesTask } from '../src/jobs/buildSlidesRunner';
import { COLLECTIONS } from '../src/lib/collections';
import { MEDIA_DIR } from '../src/lib/paths';
import { runPayloadScript } from './lib/payloadScript';

const target = process.argv[2] ?? 'all';
const outputDirectory = resolve(process.argv[3] ?? join(MEDIA_DIR, 'generated-document-kinds'));
const selected =
  target === 'all'
    ? DOCUMENT_TEMPLATE_FIXTURES
    : [documentTemplateFixture(DOCUMENT_TEMPLATE_ID_SCHEMA.parse(target))];

await runPayloadScript(async (payload) => {
  mkdirSync(outputDirectory, { recursive: true });
  const organisations = await payload.find({
    collection: COLLECTIONS.organisations,
    where: { name: { equals: 'Document Template Dogfood' } },
    limit: 1,
    depth: 0,
  });
  const organisation =
    organisations.docs[0] ??
    (await payload.create({
      collection: COLLECTIONS.organisations,
      data: {
        name: 'Document Template Dogfood',
        primary: '#02585C',
        secondary: '#F5A3B0',
        ink: '#0F2A2B',
        paper: '#FAFBFB',
        headingFont: 'Gilroy',
        bodyFont: 'Roboto',
      },
      depth: 0,
    }));

  const results = [];
  for (const fixture of selected) {
    const template = resolveDocumentTemplate(fixture.id);
    const previous = await payload.find({
      collection: COLLECTIONS.presentations,
      where: {
        and: [
          { title: { equals: fixture.title } },
          { organisation: { equals: organisation.id } },
          { documentTemplate: { equals: fixture.id } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    const data = {
      title: fixture.title,
      slug: `dogfood-${fixture.id}`,
      organisation: organisation.id,
      documentTemplate: fixture.id,
      language: 'fr' as const,
      status: 'draft' as const,
      agentBrief: '',
      footer: {
        enabled: true,
        left: '{org.name}',
        center: '',
        right: '{page} / {total}',
      },
      slides: fixture.slides as never,
    };
    const presentation = previous.docs[0]
      ? await payload.update({
          collection: COLLECTIONS.presentations,
          id: previous.docs[0].id,
          data,
          depth: 0,
        })
      : await payload.create({
          collection: COLLECTIONS.presentations,
          data,
          depth: 0,
          draft: false,
        });

    const result = await runBuildSlidesTask({
      input: { presentationId: presentation.id },
      req: { payload },
    });
    if (!result.output.success) {
      throw new Error(`Échec du build « ${fixture.id} » : ${JSON.stringify(result.output)}`);
    }

    const built = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentation.id,
      depth: 1,
    });
    const artifacts = (built.artifacts ?? []) as Array<{
      key: string;
      file?: { filename?: string | null } | number | null;
      pageIndex?: number | null;
    }>;
    const written = [];
    for (const artifact of artifacts) {
      if (!artifact.file || typeof artifact.file !== 'object' || !artifact.file.filename) continue;
      const extension = artifact.file.filename.split('.').pop() ?? 'bin';
      const suffix = artifact.pageIndex == null ? '' : `-${artifact.pageIndex + 1}`;
      const destination = join(
        outputDirectory,
        `${fixture.id}-${artifact.key}${suffix}.${extension}`,
      );
      copyFileSync(join(MEDIA_DIR, artifact.file.filename), destination);
      written.push(destination);
    }
    results.push({
      template: fixture.id,
      canvas: `${template.canvas.width}x${template.canvas.height}`,
      status: built.lastBuildStatus,
      artifacts: artifacts.map((artifact) => artifact.key),
      written,
    });
  }

  console.log(JSON.stringify(results, null, 2));
});
