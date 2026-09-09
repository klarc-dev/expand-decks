import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

import {
  applyDocumentCanvasToHeadmatter,
  resolveDocumentTemplate,
} from '../../documents/templates';
import { buildSlidesMd } from '../../export/buildSlidesMd';
import {
  MEDIA_PRODUCER_REQUEST_SCHEMA,
  mediaProducerCapabilities,
  mediaProducerImageRole,
  succeededMediaProducerResult,
} from '../../lib/mediaProducer';
import { assertTransportConstraints, measurePngArtifact } from '../../lib/mediaProducerArtifact';
import { orderedPngPaths, stageBuildDir, validateSlideLayout } from '../buildSlidesRunner';
import { buildSlidevEnv, buildSlidevExportArgs } from '../slidevExportArgs';

const execFile = promisify(execFileCallback);
const projectRoot = process.cwd();
const slidevWorkspace = join(projectRoot, 'slidev-workspace');
const slidev = join(slidevWorkspace, 'node_modules', '.bin', 'slidev');
const retainedFixtureRoot = process.env.MEDIA_PRODUCER_FIXTURE_DIR;
const workdirs: string[] = [];

const cases = [
  {
    fixture: 'linkedin-image',
    format: 'linkedin_image' as const,
    templateId: 'visual-publication',
    publicationId: 'spec19-linkedin-image-real-export',
    date: '2026-09-09T10:00:00Z',
    editorialFormat: 'image',
    caption: 'A verified square image accompanies this approved caption.',
    title: 'One verified image',
    pages: [
      {
        order: 1,
        block: {
          blockType: 'statement' as const,
          eyebrow: 'Native image',
          title: 'One renderer, one real PNG',
        },
        alt_text: 'Square graphic stating that one renderer produces one real PNG.',
      },
    ],
    minimum: 1 as const,
    maximum: 1 as const,
    expectedGeometry: [1080, 1080] as const,
  },
  {
    fixture: 'linkedin-multi-image',
    format: 'linkedin_multi_image' as const,
    templateId: 'linkedin-carousel',
    publicationId: 'spec19-linkedin-multi-image-real-export',
    date: '2026-09-09T11:00:00Z',
    editorialFormat: 'multi_image',
    caption: 'Two ordered images show the verified native gallery path.',
    title: 'Two verified images',
    pages: [
      {
        order: 1,
        block: {
          blockType: 'statement' as const,
          eyebrow: 'First image',
          title: 'Order is part of the contract',
        },
        alt_text: 'First portrait graphic explaining that image order is contractual.',
      },
      {
        order: 2,
        block: {
          blockType: 'statement' as const,
          eyebrow: 'Second image',
          title: 'Hashes bind the exact bytes',
        },
        alt_text: 'Second portrait graphic explaining that hashes bind the exact PNG bytes.',
      },
    ],
    minimum: 2 as const,
    maximum: null,
    expectedGeometry: [1080, 1350] as const,
  },
] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe('media producer real native image exports', () => {
  afterAll(() => {
    for (const workdir of workdirs) rmSync(workdir, { recursive: true, force: true });
  });

  it.each(cases)(
    'exports and emits a retained $format bundle through the real Slidev path',
    async (fixtureCase) => {
      const production = {
        producer: 'expand-decks',
        title: fixtureCase.title,
        language: 'en',
        organisation_id: 7,
        pages: fixtureCase.pages,
      };
      const canonicalInput = {
        publication_id: fixtureCase.publicationId,
        integration: 'linkedin',
        platform: 'linkedin',
        date: fixtureCase.date,
        format: fixtureCase.editorialFormat,
        content: [fixtureCase.caption],
        settings: {},
        production,
      };
      const revision = createHash('sha256').update(stableJson(canonicalInput)).digest('hex');
      const request = MEDIA_PRODUCER_REQUEST_SCHEMA.parse({
        contract: 'expand-decks.media-request/1.0',
        publication_id: fixtureCase.publicationId,
        revision_sha256: revision,
        producer: 'expand-decks',
        intended_format: fixtureCase.format,
        copy_relationship: 'accompanies_caption',
        title: fixtureCase.title,
        language: 'en',
        organisation_id: 7,
        pages: fixtureCase.pages,
        accessibility: { reading_order_required: true, minimum_body_px: null },
        constraints: {
          delivery_pdf: null,
          transport_images: {
            media_type: 'image/png',
            max_bytes_each: 10 * 1024 * 1024,
            minimum_count: fixtureCase.minimum,
            maximum_count: fixtureCase.maximum,
          },
        },
      });
      const template = resolveDocumentTemplate(fixtureCase.templateId);
      const workdir = stageBuildDir({
        slidesMd: buildSlidesMd(
          {
            title: fixtureCase.title,
            documentTemplate: fixtureCase.templateId,
            language: 'en',
            slides: fixtureCase.pages.map((page) => page.block),
          } as never,
          {
            headmatter: applyDocumentCanvasToHeadmatter('theme: default', template),
            vars: { total: fixtureCase.pages.length },
            template,
          },
        ),
        themeCss: '',
        mermaidConfigSource: 'export default {}',
        footerEnabled: false,
        logoPresent: false,
      });
      workdirs.push(workdir);
      await execFile(slidev, ['build', '--base', './'], {
        cwd: workdir,
        env: buildSlidevEnv(),
        timeout: 5 * 60 * 1000,
      });
      await validateSlideLayout(workdir, fixtureCase.pages.length);
      const outputDir = join(workdir, 'transport-pages');
      mkdirSync(outputDir, { recursive: true });
      await execFile(
        slidev,
        buildSlidevExportArgs({
          output: outputDir,
          format: 'png',
          hasMermaid: false,
          perSlide: true,
        }),
        { cwd: workdir, env: buildSlidevEnv(), timeout: 5 * 60 * 1000 },
      );
      const paths = orderedPngPaths(outputDir);
      const artifacts = await Promise.all(
        paths.map((path, index) =>
          measurePngArtifact(
            readFileSync(path),
            `${fixtureCase.fixture}-${index + 1}`,
            index + 1,
            request.pages[index]!.alt_text,
            mediaProducerImageRole(request.intended_format),
          ),
        ),
      );
      assertTransportConstraints(artifacts, request.constraints.transport_images);
      const result = succeededMediaProducerResult(
        {
          request_id:
            fixtureCase.format === 'linkedin_image'
              ? '5fc48d63-a3f5-43a4-8dad-ec1a7a912001'
              : '5fc48d63-a3f5-43a4-8dad-ec1a7a912002',
          publication_id: request.publication_id,
          revision_sha256: request.revision_sha256,
          presentation_id: fixtureCase.format === 'linkedin_image' ? 101 : 102,
        },
        request,
        [],
        artifacts,
      );

      expect(paths).toHaveLength(fixtureCase.pages.length);
      expect(artifacts.map((artifact) => [artifact.width_px, artifact.height_px])).toEqual(
        Array.from({ length: artifacts.length }, () => [...fixtureCase.expectedGeometry]),
      );
      expect(result.delivery_artifacts).toEqual([]);
      expect(result.transport_artifacts.map((artifact) => artifact.sha256)).toEqual(
        paths.map((path) => createHash('sha256').update(readFileSync(path)).digest('hex')),
      );

      if (retainedFixtureRoot) {
        const bundleDir = join(retainedFixtureRoot, fixtureCase.fixture);
        const assetsDir = join(bundleDir, 'assets');
        rmSync(bundleDir, { recursive: true, force: true });
        mkdirSync(assetsDir, { recursive: true });
        paths.forEach((path, index) => {
          cpSync(path, join(assetsDir, `transport-${String(index + 1).padStart(3, '0')}.png`));
        });
        writeJson(join(bundleDir, 'canonical-input.json'), canonicalInput);
        writeJson(join(bundleDir, 'calendar.json'), {
          brand: 'Producer fixture',
          year: 2026,
          timezone: 'UTC',
          platforms: ['linkedin'],
          pillars: [{ name: 'product', weight: 100 }],
          posts: [
            {
              id: fixtureCase.publicationId,
              integration: 'linkedin',
              platform: 'linkedin',
              date: fixtureCase.date,
              pillar: 'product',
              format: fixtureCase.editorialFormat,
              content: fixtureCase.caption,
              settings: {},
              media_brief: fixtureCase.title,
            },
          ],
        });
        writeJson(join(bundleDir, 'media-requests.json'), {
          contract: 'social-media.media-requests/1.0',
          requests: [{ publication_id: fixtureCase.publicationId, ...production }],
        });
        writeJson(join(bundleDir, 'capabilities.json'), mediaProducerCapabilities());
        writeJson(join(bundleDir, 'request.json'), request);
        writeJson(join(bundleDir, 'result.json'), result);
      }
    },
    5 * 60 * 1000,
  );
});
