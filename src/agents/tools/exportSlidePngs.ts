/**
 * exportBuild tool — render an assembled deck to per-slide PNGs via the REAL
 * Slidev pipeline, so the visual scorer judges what the audience actually sees
 * (true overflow, fonts, layout). Reuses the exact staging + binary-resolution
 * pattern from `buildSlidesRunner.ts` (symlinked node_modules, base style.css,
 * headmatter), but exports `--format png --per-slide` instead of a PDF/SPA, and
 * needs no Payload doc — just the deck markdown string.
 *
 * `--per-slide` renders each slide individually so backgrounds/global layers are
 * included. `playwright-chromium` is already installed in slidev-workspace.
 */
import { execFile as execFileCb } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR } from '../../lib/paths';
import { buildSlidevExportArgs } from '../../jobs/slidevExportArgs';

const execFile = promisify(execFileCb);
const PROJECT_ROOT = process.cwd();
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXPORT_DIR = join(PROJECT_ROOT, 'src', 'export');
const EXEC_TIMEOUT_MS = 5 * 60 * 1000;

export type ExportedPng = { page: number; path: string; base64: string };

export function deckHasMermaid(slidesMd: string): boolean {
  return /^```mermaid\s*$/m.test(slidesMd);
}

/**
 * Stage a minimal Slidev workdir from a deck markdown string and export one PNG
 * per slide. Returns the PNGs in page order (base64 for multimodal scoring).
 * The caller owns cleanup via the returned `cleanup()`.
 */
export async function exportSlidePngs(
  slidesMd: string,
): Promise<{ pngs: ExportedPng[]; cleanup: () => void }> {
  const workdir = mkdtempSync(join(tmpdir(), 'slidev-png-'));
  const cleanup = () => {
    try {
      rmSync(workdir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  };

  try {
    symlinkSync(join(SLIDEV_WORKSPACE, 'node_modules'), join(workdir, 'node_modules'), 'dir');
    if (existsSync(MEDIA_DIR)) symlinkSync(MEDIA_DIR, join(workdir, 'media'), 'dir');

    writeFileSync(join(workdir, ARTIFACTS.slidesMd), slidesMd, 'utf-8');
    const baseCss = readFileSync(join(EXPORT_DIR, ARTIFACTS.styleCss), 'utf-8');
    writeFileSync(join(workdir, ARTIFACTS.styleCss), baseCss, 'utf-8');
    cpSync(join(EXPORT_DIR, ARTIFACTS.headmatter), join(workdir, ARTIFACTS.headmatter));
    mkdirSync(join(workdir, ARTIFACTS.setupDir), { recursive: true });
    cpSync(
      join(EXPORT_DIR, ARTIFACTS.mermaidSetupSrc),
      join(workdir, ARTIFACTS.setupDir, ARTIFACTS.mermaidSetupDest),
    );
    cpSync(
      join(EXPORT_DIR, 'mermaidConfig.ts'),
      join(workdir, ARTIFACTS.setupDir, 'mermaidConfig.ts'),
    );
    if (existsSync(PUBLIC_FONTS_DIR)) {
      cpSync(PUBLIC_FONTS_DIR, join(workdir, 'public', ARTIFACTS.fonts), { recursive: true });
    }

    const outDir = join(workdir, 'png');
    const slidevPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
    // Share the PDF export path's native flag policy (U6): `--wait-until load`
    // for ordinary decks, Mermaid-aware `networkidle` + settle wait for diagram
    // decks. `--per-slide` stays PNG-only so global/background layers render.
    const exportArgs = buildSlidevExportArgs({
      output: outDir,
      format: 'png',
      hasMermaid: deckHasMermaid(slidesMd),
      perSlide: true,
    });
    await execFile(slidevPath, exportArgs, {
      cwd: workdir,
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: undefined,
        OPENAI_API_KEY: undefined,
      },
    });

    // Slidev writes png/<n>.png (or slides-<n>.png depending on version). Sort numerically.
    const files = readdirSync(outDir)
      .filter((f) => f.endsWith('.png'))
      .sort((a, b) => pageNum(a) - pageNum(b));

    const pngs: ExportedPng[] = files.map((f, i) => {
      const path = join(outDir, f);
      return { page: i + 1, path, base64: readFileSync(path).toString('base64') };
    });

    return { pngs, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}

function pageNum(filename: string): number {
  const m = filename.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
