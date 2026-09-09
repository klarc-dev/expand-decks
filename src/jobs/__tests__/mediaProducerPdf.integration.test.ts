import { execFile as execFileCallback } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, describe, expect, it } from 'vitest';

import { ARTIFACTS } from '../../lib/paths';
import {
  assertTransportConstraints,
  measurePdfArtifact,
  measurePngArtifact,
} from '../../lib/mediaProducerArtifact';
import { buildSlidesMd } from '../../export/buildSlidesMd';
import { orderedPngPaths, stageBuildDir, validateSlideLayout } from '../buildSlidesRunner';
import { buildSlidevEnv, buildSlidevExportArgs } from '../slidevExportArgs';

const execFile = promisify(execFileCallback);
const projectRoot = process.cwd();
const slidevWorkspace = join(projectRoot, 'slidev-workspace');
const slidev = join(slidevWorkspace, 'node_modules', '.bin', 'slidev');

describe('media producer real PDF', () => {
  let workdir: string | null = null;

  afterAll(() => {
    if (workdir) rmSync(workdir, { recursive: true, force: true });
  });

  it(
    'exports real Slidev bytes and measures their page geometry',
    async () => {
      workdir = stageBuildDir({
        slidesMd: buildSlidesMd(
          {
            title: 'Producer smoke',
            language: 'fr',
            slides: [
              { blockType: 'statement', title: 'Producer smoke', text: 'A real first page.' },
              { blockType: 'statement', title: 'Revision bound', text: 'A real second page.' },
            ],
          } as never,
          { headmatter: 'theme: default', vars: { total: 2 } },
        ),
        themeCss: '',
        mermaidConfigSource: 'export default {}',
        footerEnabled: false,
        logoPresent: false,
      });
      await execFile(slidev, ['build', '--base', './'], {
        cwd: workdir,
        env: buildSlidevEnv(),
        timeout: 5 * 60 * 1000,
      });
      await validateSlideLayout(workdir, 2);
      await execFile(
        slidev,
        buildSlidevExportArgs({ output: ARTIFACTS.pdf, hasMermaid: false, perSlide: true }),
        { cwd: workdir, env: buildSlidevEnv(), timeout: 5 * 60 * 1000 },
      );
      const transportDir = join(workdir, 'transport-pages');
      mkdirSync(transportDir, { recursive: true });
      await execFile(
        slidev,
        buildSlidevExportArgs({
          output: transportDir,
          format: 'png',
          hasMermaid: false,
          perSlide: true,
        }),
        { cwd: workdir, env: buildSlidevEnv(), timeout: 5 * 60 * 1000 },
      );

      const artifact = await measurePdfArtifact(
        readFileSync(join(workdir, ARTIFACTS.pdf)),
        'real-pdf',
      );
      expect(artifact).toMatchObject({
        role: 'delivery_document',
        media_type: 'application/pdf',
        page_count: 2,
      });
      expect(artifact.bytes).toBeGreaterThan(1000);
      expect(artifact.width_px).toBeGreaterThan(0);
      expect(artifact.height_px).toBeGreaterThan(0);
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);

      const pngs = await Promise.all(
        orderedPngPaths(transportDir).map((path, index) =>
          measurePngArtifact(
            readFileSync(path),
            `real-png-${index + 1}`,
            index + 1,
            `Page ${index + 1}`,
          ),
        ),
      );
      assertTransportConstraints(pngs, {
        media_type: 'image/png',
        max_bytes_each: 10 * 1024 * 1024,
        minimum_count: 2,
      });
      expect(pngs).toHaveLength(2);
      expect(pngs.map((png) => png.order)).toEqual([1, 2]);
      expect(pngs.every((png) => png.bytes > 1000)).toBe(true);
      expect(pngs.every((png) => png.width_px === pngs[0]?.width_px)).toBe(true);
      expect(pngs.every((png) => png.height_px === pngs[0]?.height_px)).toBe(true);
      expect(pngs[0]?.width_px).toBeGreaterThan(0);
      expect(pngs[0]?.height_px).toBeGreaterThan(0);
    },
    5 * 60 * 1000,
  );
});
