import { execFile as execFileCb } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import type { TaskConfig } from 'payload';

import { buildSlidesMd } from '../export/buildSlidesMd';

const execFile = promisify(execFileCb);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const SLIDEV_WORKSPACE = resolve(__dirname, '../../slidev-workspace');
const EXPORT_DIR = resolve(__dirname, '../export');
const MEDIA_DIR = resolve(__dirname, '../../media');

const EXEC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Run a command inside the Slidev workspace using its local node_modules.
 * Uses execFile with argument arrays for shell safety.
 */
async function runSlidev(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  const npxPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
  return execFile(npxPath, args, {
    cwd,
    timeout: EXEC_TIMEOUT_MS,
    env: {
      ...process.env,
      // Strip secrets the builder doesn't need
      ANTHROPIC_API_KEY: undefined,
    },
  });
}

export const buildSlidesTask: TaskConfig<any> = {
  slug: 'buildSlides',
  label: 'Build Slidev Presentation',
  inputSchema: [
    {
      name: 'presentationId',
      type: 'text',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'success',
      type: 'checkbox',
    },
  ],
  retries: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 10_000 },
  },
  handler: async ({ input, req }) => {
    const { presentationId } = input as { presentationId: string };
    let workdir: string | null = null;

    try {
      // 1. Set status to building
      await req.payload.update({
        collection: 'presentations',
        id: presentationId,
        data: { lastBuildStatus: 'building', lastBuildError: '' },
        context: { skipBuildQueue: true },
      });

      // 2. Fetch the full presentation
      const presentation = await req.payload.findByID({
        collection: 'presentations',
        id: presentationId,
        depth: 0,
      });

      const slug = presentation.slug as string;
      if (!SLUG_RE.test(slug)) {
        throw new Error(`Invalid slug format: "${slug}"`);
      }

      // 3. Generate slides.md
      const slidesMd = buildSlidesMd(presentation as any);

      // 4. Create temp workdir
      workdir = mkdtempSync(join(tmpdir(), 'slidev-build-'));

      // Symlink slidev-workspace's node_modules so Slidev can resolve
      // @slidev/theme-default and the rest of its deps from cwd. Without this,
      // slidev errors with "theme @slidev/theme-default was not found".
      symlinkSync(
        join(SLIDEV_WORKSPACE, 'node_modules'),
        join(workdir, 'node_modules'),
        'dir',
      );

      // Symlink media/ so frontmatter `image: /media/<file>` references resolve
      // when Slidev fetches assets via Vite's static fs.
      try {
        symlinkSync(MEDIA_DIR, join(workdir, 'media'), 'dir');
      } catch {
        // media/ may not exist yet on first build — not critical
      }

      // Write slides.md
      writeFileSync(join(workdir, 'slides.md'), slidesMd, 'utf-8');

      // Copy style.css
      cpSync(join(EXPORT_DIR, 'style.css'), join(workdir, 'style.css'));

      // Copy headmatter.yaml (for reference, already embedded in slides.md)
      cpSync(join(EXPORT_DIR, 'headmatter.yaml'), join(workdir, 'headmatter.yaml'));

      // Copy fonts if they exist
      const fontsDir = join(EXPORT_DIR, 'fonts');
      try {
        cpSync(fontsDir, join(workdir, 'fonts'), { recursive: true });
      } catch {
        // Fonts directory may not exist yet — not critical
      }

      // 5. Build SPA with a relative base so assets resolve wherever the dist
      // is mounted (/spa/<slug>/ and /share/<token>/spa/). Pairs with
      // `routerMode: hash` in headmatter.yaml.
      await runSlidev(['build', '--base', './'], workdir);

      // 6. Export PDF
      await runSlidev(['export', '--format', 'pdf', '--output', 'slides.pdf'], workdir);

      // 7. Upload PDF to Payload Media
      const pdfBuffer = readFileSync(join(workdir, 'slides.pdf'));
      const pdfMedia = await req.payload.create({
        collection: 'media',
        data: { alt: `${presentation.title} — PDF` },
        file: {
          data: pdfBuffer,
          mimetype: 'application/pdf',
          name: `${slug}.pdf`,
          size: pdfBuffer.byteLength,
        },
      });

      // 8. Copy SPA dist to media/spa/<slug>/
      const spaTargetDir = join(MEDIA_DIR, 'spa', slug);
      // Remove previous build if it exists
      rmSync(spaTargetDir, { recursive: true, force: true });
      cpSync(join(workdir, 'dist'), spaTargetDir, { recursive: true });

      // 9. Patch presentation with build artifacts
      await req.payload.update({
        collection: 'presentations',
        id: presentationId,
        data: {
          pdfFile: pdfMedia.id,
          // index.html explicitly: the dist uses relative asset URLs, which
          // only resolve against a path ending in a filename or trailing
          // slash (Next strips trailing slashes with a 308).
          spaUrl: `/spa/${slug}/index.html`,
          lastBuildStatus: 'success',
          lastBuildError: '',
        },
        context: { skipBuildQueue: true },
      });

      return { output: { success: true } };
    } catch (err) {
      // 10. On failure: record error
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      await req.payload.update({
        collection: 'presentations',
        id: presentationId,
        data: {
          lastBuildStatus: 'failed',
          lastBuildError: errorMessage.slice(0, 5000),
        },
        context: { skipBuildQueue: true },
      });

      throw err;
    } finally {
      // 11. Clean up temp workdir
      if (workdir) {
        rmSync(workdir, { recursive: true, force: true });
      }
    }
  },
};
