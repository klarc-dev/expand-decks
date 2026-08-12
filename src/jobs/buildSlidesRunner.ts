import { randomUUID } from 'node:crypto';
import { execFile as execFileCb } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { TaskHandlerArgs } from 'payload';

import { buildSlidesMd } from '../export/buildSlidesMd';
import {
  buildFooterHeadmatter,
  buildFooterLayer,
  buildLogoLayer,
  type FooterConfig,
} from '../export/chrome';
import { buildHeadmatter, buildThemeCss, type OrgBrand } from '../export/theme';
import { resolveVarsWith } from '../export/vars';
import { COLLECTIONS } from '../lib/collections';
import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR, spaDir, spaUrl } from '../lib/paths';
import { SLUG_RE } from '../lib/slug';
import { BUILD_STATUS } from '../lib/status';
import { buildFingerprint } from '../lib/buildFingerprint';
import { patchPresentationBuildMetadata } from './patchPresentationBuildMetadata';
import { buildSlidevEnv, buildSlidevExportArgs } from './slidevExportArgs';

const execFile = promisify(execFileCb);

const PROJECT_ROOT = join(/* turbopackIgnore: true */ process.cwd());
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXPORT_DIR = join(PROJECT_ROOT, 'src', 'export');

const EXEC_TIMEOUT_MS = 5 * 60 * 1000;
const COVER_DIR = 'cover';

async function runSlidev(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const slidevPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
  return execFile(slidevPath, args, {
    cwd,
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: buildSlidevEnv(),
  });
}

type StageOptions = {
  slidesMd: string;
  themeCss: string;
  footerEnabled: boolean;
  logoPresent: boolean;
};

type SlideWithMedia = {
  image?: unknown;
  intervenants?: unknown;
};

function hasMediaObject(value: unknown): boolean {
  return Boolean(value && typeof value === 'object');
}

export function slideHasImages(block: SlideWithMedia): boolean {
  return hasMediaObject(block.image) || hasMediaObject(block.intervenants);
}

export function firstPngPath(directory: string): string {
  const filename = readdirSync(directory)
    .filter((entry) => entry.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  if (!filename) throw new Error('Slidev did not generate a cover PNG');
  return join(directory, filename);
}

// Exported for the staging contract test. The symlinked `node_modules`
// preserves Vite's default `node_modules/.vite` pre-bundle cache across the
// per-build temporary workdirs.
export function stageBuildDir({
  slidesMd,
  themeCss,
  footerEnabled,
  logoPresent,
}: StageOptions): string {
  const workdir = mkdtempSync(join(tmpdir(), 'slidev-build-'));

  symlinkSync(join(SLIDEV_WORKSPACE, 'node_modules'), join(workdir, 'node_modules'), 'dir');
  if (existsSync(MEDIA_DIR)) {
    symlinkSync(MEDIA_DIR, join(workdir, 'media'), 'dir');
  }

  writeFileSync(join(workdir, ARTIFACTS.slidesMd), slidesMd, 'utf-8');

  const baseCss = readFileSync(join(EXPORT_DIR, ARTIFACTS.styleCss), 'utf-8');
  writeFileSync(join(workdir, ARTIFACTS.styleCss), `${baseCss}\n${themeCss}`, 'utf-8');

  cpSync(join(EXPORT_DIR, ARTIFACTS.headmatter), join(workdir, ARTIFACTS.headmatter));

  // Slidev auto-loads ./setup/mermaid.ts (the official Mermaid theming hook).
  // We ship it from src/export so diagrams use the Klarc palette and emit a
  // max-width SVG that the .k-mermaid CSS can scale to fit the canvas.
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

  const footerLayer = buildFooterLayer(footerEnabled);
  if (footerLayer) {
    writeFileSync(join(workdir, ARTIFACTS.footerLayer), footerLayer, 'utf-8');
  }
  const logoLayer = buildLogoLayer(logoPresent);
  if (logoLayer) {
    writeFileSync(join(workdir, ARTIFACTS.logoLayer), logoLayer, 'utf-8');
  }

  return workdir;
}

export async function runBuildSlidesTask({ input, req }: TaskHandlerArgs<'buildSlides'>) {
  const { presentationId, buildToken } = input as {
    presentationId: string;
    buildToken?: string;
  };
  let workdir: string | null = null;

  try {
    const presentation = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 0,
    });
    if (buildToken && (presentation as { lastBuildToken?: string }).lastBuildToken !== buildToken) {
      req.payload.logger.info(
        `Presentation ${presentationId} has a newer build token; skipped stale job.`,
      );
      return { output: { success: false, skipped: 'stale' } };
    }

    await patchPresentationBuildMetadata(req.payload, presentationId, {
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
    });
    const initialFingerprint = buildFingerprint(presentation as unknown as Record<string, unknown>);
    const previousPdfId =
      typeof presentation.pdfFile === 'object' ? presentation.pdfFile?.id : presentation.pdfFile;
    const previousCoverId =
      typeof presentation.coverImage === 'object'
        ? presentation.coverImage?.id
        : presentation.coverImage;

    const slug = presentation.slug as string;
    if (!SLUG_RE.test(slug)) {
      throw new Error(`Invalid slug format: "${slug}"`);
    }

    const orgRel = (presentation as { organisation?: number | { id: number } }).organisation;
    const orgId = typeof orgRel === 'object' && orgRel ? orgRel.id : orgRel;
    const org = orgId
      ? await req.payload.findByID({
          collection: COLLECTIONS.organisations,
          id: orgId,
          depth: 1,
        })
      : null;
    const brand = org as (OrgBrand & Record<string, unknown>) | null;

    // Render from a hydrated document so relationship fields inside blocks (for
    // example cover intervenants → users → avatar media) resolve to objects for
    // the pure renderers. The depth-0 `presentation` above stays the
    // fingerprint/stale source so relationship population never changes build
    // identity.
    const renderPresentation = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 2,
    });

    const footer = (presentation as { footer?: Partial<FooterConfig> }).footer;
    const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
    const logoUrl =
      logoRel && typeof logoRel === 'object' && logoRel.filename
        ? `/media/${logoRel.filename}`
        : null;

    // Single resolution context — the SSOT for {path} variables in slide bodies
    // AND footer templates. Exposes the whole presentation, its linked org under
    // both {org.*} (alias) and {organisation.*} (real path), plus synthetic
    // {date}/{total}. Adding a field to either collection makes {thatField} work
    // with no code change here.
    const vars: Record<string, unknown> = {
      ...renderPresentation,
      organisation: org ?? undefined,
      org: org ?? undefined,
      date: new Date().toLocaleDateString(presentation.language === 'en' ? 'en-GB' : 'fr-FR'),
      total: (renderPresentation.slides as unknown[] | undefined)?.length ?? 0,
    };

    // Pre-resolve static tokens in footer templates; {page}/{total} stay live in
    // the Vue layer (they need per-slide nav state).
    const resolvedFooter = footer
      ? {
          ...footer,
          left: resolveVarsWith(footer.left ?? '', vars),
          center: resolveVarsWith(footer.center ?? '', vars),
          right: resolveVarsWith(footer.right ?? '', vars),
        }
      : footer;

    const baseHeadmatter = readFileSync(join(EXPORT_DIR, ARTIFACTS.headmatter), 'utf-8').trim();
    const themedHeadmatter = buildHeadmatter(
      baseHeadmatter,
      brand,
      presentation.language as string | undefined,
    );
    const chromeHeadmatter = buildFooterHeadmatter(resolvedFooter, logoUrl);
    const slidesMd = buildSlidesMd(renderPresentation as never, {
      headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
      vars,
    });

    const themeCss = buildThemeCss(brand);
    workdir = stageBuildDir({
      slidesMd,
      themeCss,
      footerEnabled: Boolean(footer?.enabled),
      logoPresent: Boolean(logoUrl),
    });

    const slides =
      (renderPresentation.slides as ({ blockType?: string } & SlideWithMedia)[] | undefined) ?? [];
    const hasMermaid = slides.some((block) => block?.blockType === 'mermaid');
    const hasImages = Boolean(logoUrl) || slides.some(slideHasImages);

    // Use one staged workdir and run the native commands sequentially for
    // deterministic output. The export helper retains the fixed 120s CLI timeout,
    // Mermaid/image settling, and range/per-slide options needed by PNG exports.
    await runSlidev(['build', '--base', './'], workdir);
    await runSlidev(
      buildSlidevExportArgs({ output: ARTIFACTS.pdf, hasMermaid, hasImages }),
      workdir,
    );
    if (slides.length > 0) {
      await runSlidev(
        buildSlidevExportArgs({
          output: COVER_DIR,
          format: 'png',
          hasMermaid: slides[0]?.blockType === 'mermaid',
          hasImages: Boolean(logoUrl) || slideHasImages(slides[0] ?? {}),
          perSlide: true,
          range: '1',
        }),
        workdir,
      );
    }

    const latest = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 0,
    });
    if (
      (buildToken && (latest as { lastBuildToken?: string }).lastBuildToken !== buildToken) ||
      buildFingerprint(latest as unknown as Record<string, unknown>) !== initialFingerprint
    ) {
      req.payload.logger.info(
        `Presentation ${presentationId} changed during build; skipped stale artifact write.`,
      );
      return { output: { success: false, skipped: 'stale' } };
    }

    const patchData: Record<string, unknown> = {
      lastBuildStatus: BUILD_STATUS.success,
      lastBuildError: '',
    };
    let pdfMediaId: unknown = null;
    let coverMediaId: unknown = null;

    const pdfBuffer = readFileSync(join(workdir, ARTIFACTS.pdf));
    const pdfMedia = await req.payload.create({
      collection: COLLECTIONS.media,
      data: { alt: `${presentation.title} — PDF`, presentation: Number(presentationId) },
      file: {
        data: pdfBuffer,
        mimetype: 'application/pdf',
        name: `${randomUUID()}.pdf`,
        size: pdfBuffer.byteLength,
      },
    });
    pdfMediaId = pdfMedia.id;
    patchData.pdfFile = pdfMedia.id;

    if (slides.length > 0) {
      const coverBuffer = readFileSync(firstPngPath(join(workdir, COVER_DIR)));
      const coverMedia = await req.payload.create({
        collection: COLLECTIONS.media,
        data: { alt: `${presentation.title} — couverture`, presentation: Number(presentationId) },
        file: {
          data: coverBuffer,
          mimetype: 'image/png',
          name: `${randomUUID()}.png`,
          size: coverBuffer.byteLength,
        },
      });
      coverMediaId = coverMedia.id;
      patchData.coverImage = coverMedia.id;
    } else {
      patchData.coverImage = null;
    }

    const spaTargetDir = spaDir(slug);
    rmSync(spaTargetDir, { recursive: true, force: true });
    cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });
    patchData.spaUrl = spaUrl(slug);

    await patchPresentationBuildMetadata(req.payload, presentationId, patchData);

    if (previousPdfId && previousPdfId !== pdfMediaId) {
      await req.payload
        .delete({
          collection: COLLECTIONS.media,
          id: previousPdfId,
          overrideAccess: true,
        })
        .catch((err) =>
          req.payload.logger.warn(`Failed to delete old PDF ${previousPdfId}: ${err}`),
        );
    }

    if (previousCoverId && previousCoverId !== coverMediaId) {
      await req.payload
        .delete({
          collection: COLLECTIONS.media,
          id: previousCoverId,
          overrideAccess: true,
        })
        .catch((err) =>
          req.payload.logger.warn(`Failed to delete old cover ${previousCoverId}: ${err}`),
        );
    }

    req.payload.logger.info(
      { presentationId, buildToken, slideCount: slides.length, hasMermaid },
      'slide build completed',
    );

    return { output: { success: true } };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await patchPresentationBuildMetadata(req.payload, presentationId, {
      lastBuildStatus: BUILD_STATUS.failed,
      lastBuildError: errorMessage.slice(0, 5000),
    });

    throw err;
  } finally {
    if (workdir) {
      rmSync(workdir, { recursive: true, force: true });
    }
  }
}
