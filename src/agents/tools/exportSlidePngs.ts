/**
 * exportBuild tool — render an assembled deck to per-page PNGs via the REAL
 * Slidev pipeline, so the visual scorer judges what the audience actually sees
 * (true overflow, fonts, layout, footer). The workdir is staged by the same
 * `stageBuildDir` as the production build, so the scorer never drifts from the
 * export: an earlier hand-rolled copy skipped the footer and logo Vue layers
 * and copied `mermaidConfig.ts` verbatim, whose `./theme` type import has no
 * file in the staged `setup/` directory. Needs no Payload doc, just the deck
 * markdown string.
 */
import { execFile as execFileCb } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { ARTIFACTS } from '../../lib/paths';
import { parseLayoutViolations, SlideLayoutValidationError } from '../../lib/slideLayoutValidation';
import { buildSlidevEnv, buildSlidevExportArgs } from '../../jobs/slidevExportArgs';
import { stageBuildDir } from '../../jobs/buildSlidesRunner';
import { buildMermaidConfigSource } from '../../export/mermaidConfig';
import { referencedMediaFiles } from '../../export/mediaFiles';
import { buildThemeCss } from '../../export/theme';

const execFile = promisify(execFileCb);
const PROJECT_ROOT = process.cwd();
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXEC_TIMEOUT_MS = 5 * 60 * 1000;
const LAYOUT_VALIDATOR = join(SLIDEV_WORKSPACE, 'validate-layout.mjs');

export type ExportedPng = { page: number; path: string; base64: string };

export function deckHasMermaid(slidesMd: string): boolean {
  return /^```mermaid\s*$/m.test(slidesMd);
}

/**
 * Stage a Slidev workdir from a deck markdown string and export one PNG per
 * page. Returns the PNGs in page order (base64 for multimodal scoring). The
 * caller owns cleanup via the returned `cleanup()`.
 */
export async function exportSlidePngs(
  slidesMd: string,
  signal?: AbortSignal,
): Promise<{
  pngs: ExportedPng[];
  validateLayout: () => Promise<void>;
  cleanup: () => void;
}> {
  // The footer Vue layer only renders when the headmatter carries klarcFooter.
  const footerEnabled = /^klarcFooter:/m.test(slidesMd);
  const logoPresent = /^klarcLogo:/m.test(slidesMd);
  const workdir = stageBuildDir({
    slidesMd,
    themeCss: buildThemeCss(null),
    mermaidConfigSource: buildMermaidConfigSource(null),
    footerEnabled,
    logoPresent,
    mediaFilenames: referencedMediaFiles(slidesMd),
  });
  const cleanup = () => {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  };

  try {
    const outDir = join(workdir, 'png');
    const slidevPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
    const run = (args: string[]) =>
      execFile(slidevPath, args, {
        cwd: workdir,
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
        env: buildSlidevEnv(),
        signal,
      });
    await run(['build', '--base', './']);
    await run(
      buildSlidevExportArgs({
        output: outDir,
        format: 'png',
        hasMermaid: deckHasMermaid(slidesMd),
      }),
    );

    // Slidev writes png/<n>.png (or slides-<n>.png depending on version). Sort numerically.
    const files = readdirSync(outDir)
      .filter((f) => f.endsWith('.png'))
      .sort((a, b) => pageNum(a) - pageNum(b));

    const validateLayout = async () => {
      try {
        await execFile(
          process.execPath,
          [LAYOUT_VALIDATOR, join(workdir, ARTIFACTS.dist), String(files.length)],
          {
            cwd: SLIDEV_WORKSPACE,
            timeout: EXEC_TIMEOUT_MS,
            maxBuffer: 32 * 1024 * 1024,
            signal,
          },
        );
      } catch (error) {
        const violations = parseLayoutViolations(
          typeof error === 'object' && error && 'stderr' in error ? String(error.stderr) : '',
        );
        if (violations.length > 0) throw new SlideLayoutValidationError(violations);
        throw error;
      }
    };

    const pngs: ExportedPng[] = files.map((f, i) => {
      const path = join(outDir, f);
      return {
        page: i + 1,
        path,
        base64: readFileSync(path).toString('base64'),
      };
    });

    return { pngs, validateLayout, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}

function pageNum(filename: string): number {
  const m = filename.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
