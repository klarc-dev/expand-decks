import { randomUUID } from 'node:crypto';
import { execFile as execFileCb } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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
import { CTX } from '../lib/context';
import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR, spaDir, spaUrl } from '../lib/paths';
import { SLUG_RE } from '../lib/slug';
import { BUILD_STATUS } from '../lib/status';
import { buildFingerprint } from '../lib/buildFingerprint';
import { normalizeOutputPolicy, wantsPdf, wantsSpa } from '../lib/outputPolicy';

import { buildLogPayload, createBuildTimer } from './buildTiming';
import { buildSlidevExportArgs, parsePositiveInt } from './slidevExportArgs';
import { assemblePdf, splitRangePdf } from './pdfAssemble';
import { computePageHashes, planDirtyPages } from './pdfPageHash';
import {
  copyCurrentPageToTemp,
  currentPagePath,
  promoteTempCache,
  readManifest,
  tempCacheHasAllPages,
  tempPagePath,
  writeTempManifest,
} from './pdfPageCache';
import type { PdfPageCacheManifest } from './pdfPageCache';

const execFile = promisify(execFileCb);

const PROJECT_ROOT = join(/* turbopackIgnore: true */ process.cwd());
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXPORT_DIR = join(PROJECT_ROOT, 'src', 'export');

const EXEC_TIMEOUT_MS = 5 * 60 * 1000;

async function runSlidev(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const slidevPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
  return execFile(slidevPath, args, {
    cwd,
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: undefined,
    },
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

// Exported for a staging contract test (U8): the symlinked `node_modules`
// preserves Vite's default `node_modules/.vite` pre-bundle cache across the
// per-build temp workdirs, so a custom cache directory is deliberately NOT
// introduced unless timing logs show dependency pre-bundling stays expensive.
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

type PdfExportOptions = Parameters<typeof buildSlidevExportArgs>[0];

type PdfCacheMode = 'disabled' | 'full' | 'incremental' | 'fallback';

type PdfExportResult = { cacheMode: PdfCacheMode; promote?: () => void };

function incrementalPdfEnabled(): boolean {
  return process.env.SLIDEV_EXPORT_INCREMENTAL_PDF === '1';
}

function maxDirtyRatio(): number {
  const parsed = Number.parseFloat(process.env.SLIDEV_EXPORT_INCREMENTAL_MAX_DIRTY_RATIO ?? '0.35');
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : 0.35;
}

function minSlidesForIncremental(): number {
  return parsePositiveInt(process.env.SLIDEV_EXPORT_INCREMENTAL_MIN_SLIDES, 12);
}

function buildPdfGlobalSalt(args: string[], themedHeadmatter: string, themeCss: string): string {
  return JSON.stringify({
    args: args.filter(
      (arg, i) =>
        !['--output', '--range'].includes(args[i - 1] ?? '') &&
        arg !== '--output' &&
        arg !== '--range',
    ),
    themedHeadmatter,
    themeCss,
    slidev: '@slidev/cli@52.16.0',
    pdfLib: 'pdf-lib@1.17.1',
  });
}

async function exportPdfWithOptionalCache({
  workdir,
  slug,
  buildToken,
  slides,
  exportOptions,
  themedHeadmatter,
  themeCss,
}: {
  workdir: string;
  slug: string;
  buildToken?: string;
  slides: readonly unknown[];
  exportOptions: PdfExportOptions;
  themedHeadmatter: string;
  themeCss: string;
}): Promise<PdfExportResult> {
  const fullExport = async (cacheMode: PdfCacheMode): Promise<PdfExportResult> => {
    await runSlidev(buildSlidevExportArgs(exportOptions), workdir);
    if (incrementalPdfEnabled() && buildToken && slides.length > 0) {
      try {
        const hashes = computePageHashes(slides, {
          globalSalt: buildPdfGlobalSalt(
            buildSlidevExportArgs(exportOptions),
            themedHeadmatter,
            themeCss,
          ),
        });
        await splitRangePdf(
          join(workdir, ARTIFACTS.pdf),
          hashes.map((_, i) => i),
          async (pageIndex, data) => {
            const path = tempPagePath(slug, buildToken, pageIndex);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, data);
          },
        );
        writeTempManifest(slug, buildToken, { version: 1, hashes });
        return { cacheMode, promote: () => promoteTempCache(slug, buildToken) };
      } catch {
        // Cache refresh is best-effort. The full PDF artifact is already present;
        // never fail a build because page-cache population could not validate it.
      }
    }
    return { cacheMode };
  };

  if (!incrementalPdfEnabled()) return fullExport('disabled');
  if (!buildToken || slides.length < minSlidesForIncremental()) return fullExport('fallback');

  const baseArgs = buildSlidevExportArgs(exportOptions);
  const hashes = computePageHashes(slides, {
    globalSalt: buildPdfGlobalSalt(baseArgs, themedHeadmatter, themeCss),
  });
  const manifest = readManifest(slug);
  const plan = planDirtyPages(manifest?.hashes, hashes);
  try {
    if (plan.dirtyIndexes.length === 0 && manifest && manifest.hashes.length === hashes.length) {
      for (let i = 0; i < hashes.length; i += 1) copyCurrentPageToTemp(slug, buildToken, i);
    } else if (plan.allDirty || plan.dirtyRatio > maxDirtyRatio()) {
      return fullExport('fallback');
    } else {
      for (let i = 0; i < hashes.length; i += 1) {
        if (!plan.dirtyIndexes.includes(i)) copyCurrentPageToTemp(slug, buildToken, i);
      }
    }
  } catch {
    // Warm-cache metadata existed but one or more page PDFs were missing/corrupt.
    // Fall back to the safe full export instead of failing the build.
    return fullExport('fallback');
  }

  if (plan.dirtyIndexes.length > 0) {
    const rangePdf = 'range.pdf';
    await runSlidev(
      buildSlidevExportArgs({ ...exportOptions, output: rangePdf, range: plan.range }),
      workdir,
    );
    await splitRangePdf(join(workdir, rangePdf), plan.dirtyIndexes, async (pageIndex, data) => {
      const path = tempPagePath(slug, buildToken, pageIndex);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, data);
    });
  }

  writeTempManifest(slug, buildToken, { version: 1, hashes } satisfies PdfPageCacheManifest);
  if (!tempCacheHasAllPages(slug, buildToken, hashes.length)) return fullExport('fallback');
  await assemblePdf(
    hashes.map((_, i) => tempPagePath(slug, buildToken, i)),
    join(workdir, ARTIFACTS.pdf),
  );
  return { cacheMode: 'incremental', promote: () => promoteTempCache(slug, buildToken) };
}

export async function runBuildSlidesTask({ input, req }: TaskHandlerArgs<'buildSlides'>) {
  const {
    presentationId,
    buildToken,
    outputPolicy: rawOutputPolicy,
  } = input as {
    presentationId: string;
    buildToken?: string;
    outputPolicy?: unknown;
  };
  const outputPolicy = normalizeOutputPolicy(rawOutputPolicy);
  const producePdf = wantsPdf(outputPolicy);
  const produceSpa = wantsSpa(outputPolicy);
  let workdir: string | null = null;
  const timer = createBuildTimer();

  try {
    const presentation = await timer.stage('loadPresentation', () =>
      req.payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        depth: 0,
      }),
    );
    if (buildToken && (presentation as { lastBuildToken?: string }).lastBuildToken !== buildToken) {
      req.payload.logger.info(
        `Presentation ${presentationId} has a newer build token; skipped stale job.`,
      );
      return { output: { success: false, skipped: 'stale' } };
    }

    await timer.stage('markBuilding', () =>
      req.payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { lastBuildStatus: BUILD_STATUS.building, lastBuildError: '' },
        context: { [CTX.skipBuildQueue]: true },
      }),
    );
    const initialFingerprint = buildFingerprint(presentation as unknown as Record<string, unknown>);
    const previousPdfId =
      typeof presentation.pdfFile === 'object' ? presentation.pdfFile?.id : presentation.pdfFile;

    const slug = presentation.slug as string;
    if (!SLUG_RE.test(slug)) {
      throw new Error(`Invalid slug format: "${slug}"`);
    }

    const orgRel = (presentation as { organisation?: number | { id: number } }).organisation;
    const orgId = typeof orgRel === 'object' && orgRel ? orgRel.id : orgRel;
    const org = orgId
      ? await timer.stage('loadOrganisation', () =>
          req.payload.findByID({
            collection: COLLECTIONS.organisations,
            id: orgId,
            depth: 1,
          }),
        )
      : null;
    const brand = org as (OrgBrand & Record<string, unknown>) | null;

    // Render from a hydrated document so relationship fields inside blocks (for
    // example cover intervenants → users → avatar media) resolve to objects for
    // the pure renderers. The depth-0 `presentation` above stays the
    // fingerprint/stale source so relationship population never changes build
    // identity.
    const renderPresentation = await timer.stage('hydratePresentation', () =>
      req.payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        depth: 2,
      }),
    );

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
    const renderStart = timer.elapsed();
    const slidesMd = buildSlidesMd(renderPresentation as never, {
      headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
      vars,
    });
    timer.recordSince('renderMarkdown', renderStart);

    const themeCss = buildThemeCss(brand);
    const stageStart = timer.elapsed();
    workdir = stageBuildDir({
      slidesMd,
      themeCss,
      footerEnabled: Boolean(footer?.enabled),
      logoPresent: Boolean(logoUrl),
    });
    timer.recordSince('stageBuildDir', stageStart);

    const slides =
      (renderPresentation.slides as ({ blockType?: string } & SlideWithMedia)[] | undefined) ?? [];
    const hasMermaid = slides.some((block) => block?.blockType === 'mermaid');
    const hasImages = Boolean(logoUrl) || slides.some(slideHasImages);

    // Native Slidev export flags, centralized and tested in slidevExportArgs.ts.
    // Single-pass is default. `--per-slide` is an escape hatch only. Phase-2
    // incremental PDF (default-off) reuses these same options, adding `--range`
    // only for dirty-page exports when the cache is warm and eligible.
    const exportOptions: PdfExportOptions = {
      output: ARTIFACTS.pdf,
      hasMermaid,
      hasImages,
      perSlide: process.env.SLIDEV_EXPORT_PER_SLIDE === '1',
      timeoutMs: parsePositiveInt(process.env.SLIDEV_EXPORT_TIMEOUT_MS, 120_000),
      withToc: process.env.SLIDEV_EXPORT_WITH_TOC === '1',
    };

    // build (SPA dist/) and export (PDF) are independent — disjoint outputs, no
    // shared mutable state — so run them concurrently. outputPolicy gates which
    // are produced. They share the Vite dep cache under the symlinked
    // node_modules/.vite, which already tolerates up-to-5 concurrent jobs;
    // two processes here is no new class of contention.
    const slidevTasks: Promise<unknown>[] = [];
    let pdfExportResult: PdfExportResult = { cacheMode: producePdf ? 'full' : 'disabled' };
    if (produceSpa) {
      slidevTasks.push(
        timer.stage('slidevBuildSpa', () => runSlidev(['build', '--base', './'], workdir!)),
      );
    }
    if (producePdf) {
      slidevTasks.push(
        timer.stage('slidevExportPdf', async () => {
          pdfExportResult = await exportPdfWithOptionalCache({
            workdir: workdir!,
            slug,
            buildToken,
            slides,
            exportOptions,
            themedHeadmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
            themeCss,
          });
        }),
      );
    }
    await Promise.all(slidevTasks);

    const latest = await timer.stage('staleCheckLoad', () =>
      req.payload.findByID({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        depth: 0,
      }),
    );
    if (
      (buildToken && (latest as { lastBuildToken?: string }).lastBuildToken !== buildToken) ||
      buildFingerprint(latest as unknown as Record<string, unknown>) !== initialFingerprint
    ) {
      req.payload.logger.info(
        `Presentation ${presentationId} changed during build; skipped stale artifact write.`,
      );
      return { output: { success: false, skipped: 'stale' } };
    }

    pdfExportResult.promote?.();

    const patchData: Record<string, unknown> = {
      lastBuildStatus: BUILD_STATUS.success,
      lastBuildError: '',
    };
    let pdfMediaId: unknown = null;

    if (producePdf) {
      const pdfBuffer = readFileSync(join(workdir, ARTIFACTS.pdf));
      const pdfMedia = await timer.stage('uploadPdf', () =>
        req.payload.create({
          collection: COLLECTIONS.media,
          data: { alt: `${presentation.title} — PDF`, presentation: Number(presentationId) },
          file: {
            data: pdfBuffer,
            mimetype: 'application/pdf',
            name: `${randomUUID()}.pdf`,
            size: pdfBuffer.byteLength,
          },
        }),
      );
      pdfMediaId = pdfMedia.id;
      patchData.pdfFile = pdfMedia.id;
    }

    if (produceSpa) {
      const spaCopyStart = timer.elapsed();
      const spaTargetDir = spaDir(slug);
      rmSync(spaTargetDir, { recursive: true, force: true });
      cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });
      timer.recordSince('copySpa', spaCopyStart);
      patchData.spaUrl = spaUrl(slug);
    }

    await timer.stage('patchPresentation', () =>
      req.payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: patchData,
        context: { [CTX.skipBuildQueue]: true },
      }),
    );

    if (producePdf && previousPdfId && previousPdfId !== pdfMediaId) {
      await timer
        .stage('deleteOldPdf', () =>
          req.payload.delete({
            collection: COLLECTIONS.media,
            id: previousPdfId,
            overrideAccess: true,
          }),
        )
        .catch((err) =>
          req.payload.logger.warn(`Failed to delete old PDF ${previousPdfId}: ${err}`),
        );
    }

    req.payload.logger.info(
      buildLogPayload(
        {
          presentationId,
          buildToken,
          outputPolicy,
          slideCount: slides.length,
          hasMermaid,
          cacheMode: pdfExportResult.cacheMode,
        },
        timer.durations(),
        timer.elapsed(),
      ),
      'slide build completed',
    );

    return { output: { success: true } };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

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
    if (workdir) {
      rmSync(workdir, { recursive: true, force: true });
    }
  }
}
