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
import { buildHeadmatter, buildThemeCss, type OrgBrand } from '../export/theme';
import {
  buildFooterHeadmatter,
  buildFooterLayer,
  buildLogoLayer,
  type FooterConfig,
} from '../export/chrome';
import { SLUG_RE } from '../lib/slug';
import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR, spaDir, spaUrl } from '../lib/paths';
import { COLLECTIONS } from '../lib/collections';
import { BUILD_STATUS } from '../lib/status';
import { CTX } from '../lib/context';

export const BUILD_SLIDES_TASK = 'buildSlides' as const;

const execFile = promisify(execFileCb);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIDEV_WORKSPACE = resolve(__dirname, '../../slidev-workspace');
const EXPORT_DIR = resolve(__dirname, '../export');

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
    // Slidev/Vite/Playwright are chatty; the default 1 MiB cap would kill the
    // child mid-build and surface as a misleading failure.
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      // Strip secrets the builder doesn't need
      ANTHROPIC_API_KEY: undefined,
    },
  });
}

export const buildSlidesTask: TaskConfig<any> = {
  slug: BUILD_SLIDES_TASK,
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
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { lastBuildStatus: BUILD_STATUS.building, lastBuildError: '' },
        context: { [CTX.skipBuildQueue]: true },
      });

      // 2. Fetch the full presentation
      const presentation = await req.payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        depth: 0,
      });

      const slug = presentation.slug as string;
      if (!SLUG_RE.test(slug)) {
        throw new Error(`Invalid slug format: "${slug}"`);
      }

      // 2b. Resolve the organisation explicitly (presentation is fetched at
      // depth:0 to keep relationships as ids for the rebuild fingerprint; this
      // targeted depth:1 fetch hydrates the brand + logo without bloating it).
      const orgRel = (presentation as { organisation?: number | { id: number } })
        .organisation;
      const orgId = typeof orgRel === 'object' && orgRel ? orgRel.id : orgRel;
      const org = orgId
        ? await req.payload.findByID({
            collection: COLLECTIONS.organisations,
            id: orgId,
            depth: 1,
          })
        : null;
      const brand = org as (OrgBrand & Record<string, unknown>) | null;

      // 2c. Resolve footer config + chrome vars + logo URL. The footer stores
      // templates with placeholders; static vars are resolved here, live vars
      // ({page}/{total}) stay in the layer. Logo resolves via the media symlink.
      const footer = (presentation as { footer?: Partial<FooterConfig> }).footer;
      const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
      const logoUrl =
        logoRel && typeof logoRel === 'object' && logoRel.filename
          ? `/media/${logoRel.filename}`
          : null;
      const chromeVars = {
        'org.name': (brand?.name as string) ?? '',
        title: presentation.title as string,
        date: new Date().toLocaleDateString(
          presentation.language === 'en' ? 'en-GB' : 'fr-FR',
        ),
      };

      // 3. Generate slides.md with org/presentation-specific headmatter +
      // footer/logo config embedded so the generated Vue layers can read it.
      const baseHeadmatter = readFileSync(
        join(EXPORT_DIR, ARTIFACTS.headmatter),
        'utf-8',
      ).trim();
      const themedHeadmatter = buildHeadmatter(
        baseHeadmatter,
        brand,
        presentation.language as string | undefined,
      );
      const chromeHeadmatter = buildFooterHeadmatter(footer, chromeVars, logoUrl);
      const slidesMd = buildSlidesMd(presentation as any, {
        headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
      });

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
      writeFileSync(join(workdir, ARTIFACTS.slidesMd), slidesMd, 'utf-8');

      // Write style.css = base CSS + per-organisation :root override. The
      // override is appended (last :root wins) so an org's 4 brand colors
      // re-derive all --k-* tokens while empty fields fall back to base.
      const baseCss = readFileSync(join(EXPORT_DIR, ARTIFACTS.styleCss), 'utf-8');
      writeFileSync(
        join(workdir, ARTIFACTS.styleCss),
        `${baseCss}\n${buildThemeCss(brand)}`,
        'utf-8',
      );

      // Copy headmatter.yaml (for reference, already embedded in slides.md)
      cpSync(join(EXPORT_DIR, ARTIFACTS.headmatter), join(workdir, ARTIFACTS.headmatter));

      // Copy the brand fonts into the deck's `public/fonts/` so Slidev bundles
      // them into the built SPA AND the PDF export. style.css references them as
      // `/fonts/<file>.ttf`; Slidev serves a deck-root `public/` at the SPA root,
      // so the absolute URL resolves in the standalone dist and in PDF rendering
      // (it previously only worked because Next served public/fonts at runtime —
      // the dist itself shipped no fonts, so the PDF fell back to a system font).
      try {
        cpSync(PUBLIC_FONTS_DIR, join(workdir, 'public', ARTIFACTS.fonts), {
          recursive: true,
        });
      } catch {
        // public/fonts missing — non-fatal; the deck falls back to system fonts.
      }

      // Write the per-slide footer + logo Vue layers (only when configured).
      // slide-bottom.vue (not global-bottom) carries correct per-slide state
      // into the PDF export without needing --per-slide.
      const footerLayer = buildFooterLayer(Boolean(footer?.enabled));
      if (footerLayer) {
        writeFileSync(join(workdir, ARTIFACTS.footerLayer), footerLayer, 'utf-8');
      }
      const logoLayer = buildLogoLayer(Boolean(logoUrl));
      if (logoLayer) {
        writeFileSync(join(workdir, ARTIFACTS.logoLayer), logoLayer, 'utf-8');
      }

      // 5. Build SPA with a relative base so assets resolve wherever the dist
      // is mounted (/spa/<slug>/ and /share/<token>/spa/). Pairs with
      // `routerMode: hash` in headmatter.yaml.
      await runSlidev(['build', '--base', './'], workdir);

      // 6. Export PDF
      await runSlidev(['export', '--format', 'pdf', '--output', ARTIFACTS.pdf], workdir);

      // 7. Upload PDF to Payload Media
      const pdfBuffer = readFileSync(join(workdir, ARTIFACTS.pdf));
      const pdfMedia = await req.payload.create({
        collection: COLLECTIONS.media,
        data: { alt: `${presentation.title} — PDF` },
        file: {
          data: pdfBuffer,
          mimetype: 'application/pdf',
          name: `${slug}.pdf`,
          size: pdfBuffer.byteLength,
        },
      });

      // 8. Copy SPA dist to media/spa/<slug>/
      const spaTargetDir = spaDir(slug);
      // Remove previous build if it exists
      rmSync(spaTargetDir, { recursive: true, force: true });
      cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });

      // 9. Patch presentation with build artifacts
      await req.payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: {
          pdfFile: pdfMedia.id,
          // index.html explicitly: the dist uses relative asset URLs, which
          // only resolve against a path ending in a filename or trailing
          // slash (Next strips trailing slashes with a 308).
          spaUrl: spaUrl(slug),
          lastBuildStatus: BUILD_STATUS.success,
          lastBuildError: '',
        },
        context: { [CTX.skipBuildQueue]: true },
      });

      return { output: { success: true } };
    } catch (err) {
      // 10. On failure: record error
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      await req.payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: {
          lastBuildStatus: BUILD_STATUS.failed,
          lastBuildError: errorMessage.slice(0, 5000),
        },
        context: { [CTX.skipBuildQueue]: true },
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
