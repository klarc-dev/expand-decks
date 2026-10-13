import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  imageMetadata: new Map<string, { width: number; height: number }>(),
  omitPdf: false,
}));

vi.mock('sharp', () => ({
  default: (file: string) => ({
    metadata: async () => mocks.imageMetadata.get(file) ?? {},
  }),
}));

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    execFile: (
      _file: string,
      args: string[],
      options: { cwd: string },
      callback: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      try {
        const cwd = options.cwd;
        if (args[0] === 'build') {
          mkdirSync(join(cwd, 'dist'), { recursive: true });
          writeFileSync(join(cwd, 'dist', 'index.html'), '<html></html>');
        } else if (args[0]?.endsWith('validate-layout.mjs')) {
          // The validator captures native artifacts from its print page.
          const flag = (name: string) => {
            const index = args.indexOf(name);
            return index === -1 ? undefined : args[index + 1];
          };
          const slidesMd = readFileSync(join(cwd, 'slides.md'), 'utf8');
          const slideCount = Array.from(slidesMd.matchAll(/^layout:/gm)).length;
          const canvasWidth = Number(slidesMd.match(/^canvasWidth:\s*(\d+)/m)?.[1] ?? 980);
          const aspectRatio = slidesMd.match(/^aspectRatio:\s*([^\s]+)/m)?.[1] ?? '16/9';
          const [ratioWidth, ratioHeight] = aspectRatio.split('/').map(Number);
          const height = Math.round((canvasWidth * ratioHeight) / ratioWidth);
          for (const [output, count] of [
            [flag('--png'), slideCount],
            [flag('--cover'), 1],
          ] as const) {
            if (!output) continue;
            const directory = join(cwd, output);
            mkdirSync(directory, { recursive: true });
            for (let index = 1; index <= count; index += 1) {
              const path = join(directory, `${index}.png`);
              writeFileSync(path, 'png');
              mocks.imageMetadata.set(path, { width: canvasWidth, height });
            }
          }
          const pdf = flag('--pdf');
          if (pdf && !mocks.omitPdf) writeFileSync(join(cwd, pdf), 'pdf');
        }
        callback(null, '', '');
      } catch (error) {
        callback(error as Error, '', '');
      }
      return {} as ReturnType<typeof original.execFile>;
    },
  };
});

import { DOCUMENT_TEMPLATES, type DocumentArtifactDefinition } from '../../documents/templates';
import { runBuildSlidesTask } from '../buildSlidesRunner';

const slidesByTemplate = {
  presentation: [{ blockType: 'statement', title: 'Presentation' }],
  'linkedin-carousel': [
    { blockType: 'statement', title: 'Page 1' },
    { blockType: 'cta', title: 'Page 2' },
  ],
  'standard-report': [
    { blockType: 'cover', title: 'Report' },
    { blockType: 'agenda', title: 'Contents' },
    { blockType: 'stats', title: 'Figures' },
    { blockType: 'statement', title: 'Finding 1' },
    { blockType: 'statement', title: 'Finding 2' },
    { blockType: 'cta', title: 'Conclusion' },
  ],
  'visual-publication': [{ blockType: 'statement', title: 'Publication' }],
  'sales-sheet': [{ blockType: 'statement', title: 'Sales sheet' }],
} as const;

function payloadFor(templateId: keyof typeof slidesByTemplate) {
  const presentation: Record<string, unknown> = {
    id: 42,
    title: templateId,
    slug: `test-${templateId}`,
    language: 'fr',
    documentTemplate: templateId,
    slides: slidesByTemplate[templateId],
    lastBuildToken: `build-${templateId}`,
    artifacts: [],
  };
  let mediaId = 100;
  const dbUpdates: Record<string, unknown>[] = [];
  const payload = {
    findByID: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'presentations') return presentation;
      throw new Error(`Unexpected collection ${collection}`);
    }),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      Object.assign(presentation, data);
      return presentation;
    }),
    create: vi.fn(async () => ({ id: mediaId++ })),
    delete: vi.fn(async () => ({})),
    db: {
      updateOne: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        dbUpdates.push(data);
        Object.assign(presentation, data);
        return presentation;
      }),
    },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
  return { payload, presentation, dbUpdates };
}

describe('generic document build transaction', () => {
  beforeEach(() => {
    mocks.imageMetadata.clear();
    mocks.omitPdf = false;
  });

  it.each(DOCUMENT_TEMPLATES)(
    'uploads and persists the declared artifacts for $id',
    async (template) => {
      const { payload, presentation } = payloadFor(template.id);

      await expect(
        runBuildSlidesTask({
          input: { presentationId: '42', buildToken: `build-${template.id}` },
          req: { payload } as never,
        }),
      ).resolves.toEqual({ output: { success: true } });

      expect(presentation.lastBuildStatus).toBe('success');
      expect(presentation.lastBuildToken).toBe(`build-${template.id}`);
      expect(presentation.artifacts).toEqual(
        template.artifacts.flatMap((rawArtifact) => {
          const artifact = rawArtifact as DocumentArtifactDefinition;
          return artifact.repeat === 'per-page'
            ? slidesByTemplate[template.id].map((_, pageIndex) =>
                expect.objectContaining({
                  key: artifact.key,
                  buildId: `build-${template.id}`,
                  pageIndex,
                }),
              )
            : [
                expect.objectContaining({
                  key: artifact.key,
                  buildId: `build-${template.id}`,
                  ...(artifact.pageIndex === undefined ? {} : { pageIndex: artifact.pageIndex }),
                }),
              ];
        }),
      );
      expect(
        (presentation.artifacts as Array<{ key: string }>).some(
          (artifact) => artifact.key === template.primaryArtifact,
        ),
      ).toBe(true);
      if (template.artifacts.some((artifact) => artifact.kind === 'pdf')) {
        expect(payload.create).toHaveBeenCalledWith(
          expect.objectContaining({
            file: expect.objectContaining({ mimetype: 'application/pdf' }),
          }),
        );
      }
    },
  );

  it('fails the build instead of persisting a sales sheet without its required PDF', async () => {
    mocks.omitPdf = true;
    const { payload, presentation, dbUpdates } = payloadFor('sales-sheet');

    await expect(
      runBuildSlidesTask({
        input: { presentationId: '42', buildToken: 'build-sales-sheet' },
        req: { payload } as never,
      }),
    ).rejects.toThrow();

    expect(presentation.lastBuildStatus).toBe('failed');
    expect(dbUpdates.at(-1)).toEqual(
      expect.objectContaining({ lastBuildStatus: 'failed', lastBuildError: expect.any(String) }),
    );
    expect(presentation.artifacts).toEqual([]);
  });
});
