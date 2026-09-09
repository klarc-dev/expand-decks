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
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { Payload, TaskHandlerArgs } from 'payload';
import sharp from 'sharp';

import {
  artifactFileIds,
  presentationArtifactPatch,
  type ArtifactOutput,
  type ArtifactOutputs,
} from '../documents/artifacts';
import { documentExportPlan } from '../documents/exportPlan';
import { assertDocumentPages, resolveDocumentTemplate } from '../documents/templates';
import { buildSlidesMd } from '../export/buildSlidesMd';
import {
  buildFooterHeadmatter,
  buildFooterLayer,
  buildLogoLayer,
  type FooterConfig,
} from '../export/chrome';
import { buildHeadmatter, buildThemeCss, type OrgBrand } from '../export/theme';
import { buildMermaidConfigSource } from '../export/mermaidConfig';
import { resolveVarsWith } from '../export/vars';
import { COLLECTIONS } from '../lib/collections';
import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR, spaDir, spaUrl } from '../lib/paths';
import { SLUG_RE } from '../lib/slug';
import { BUILD_STATUS } from '../lib/status';
import { buildFingerprint } from '../lib/buildFingerprint';
import { parseLayoutViolations, SlideLayoutValidationError } from '../lib/slideLayoutValidation';
import { patchPresentationBuildMetadata } from './patchPresentationBuildMetadata';
import { buildSlidevEnv, buildSlidevExportArgs } from './slidevExportArgs';

const execFile = promisify(execFileCb);

const PROJECT_ROOT = join(/* turbopackIgnore: true */ process.cwd());
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXPORT_DIR = join(PROJECT_ROOT, 'src', 'export');

const EXEC_TIMEOUT_MS = 5 * 60 * 1000;
const COVER_DIR = 'cover';
const PAGE_IMAGES_DIR = 'page-images';
const LAYOUT_VALIDATOR = join(SLIDEV_WORKSPACE, 'validate-layout.mjs');

async function runSlidev(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  const slidevPath = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
  return execFile(slidevPath, args, {
    cwd,
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    env: buildSlidevEnv(),
  });
}

export async function validateSlideLayout(workdir: string, slideCount: number): Promise<void> {
  if (slideCount === 0) return;
  try {
    await execFile(
      process.execPath,
      [LAYOUT_VALIDATOR, join(workdir, ARTIFACTS.dist), String(slideCount)],
      {
        cwd: SLIDEV_WORKSPACE,
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
  } catch (error) {
    const violations = parseLayoutViolations(
      typeof error === 'object' && error && 'stderr' in error ? String(error.stderr) : '',
    );
    if (violations.length > 0) throw new SlideLayoutValidationError(violations);
    throw error;
  }
}

type StageOptions = {
  slidesMd: string;
  themeCss: string;
  mermaidConfigSource: string;
  footerEnabled: boolean;
  logoPresent: boolean;
  mediaFilenames?: string[];
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
  const filename = pngPaths(directory)[0];
  if (!filename) throw new Error('Slidev did not generate a cover PNG');
  return filename;
}

export function pngPaths(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => entry.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filename) => join(directory, filename));
}

export async function assertPageImages(
  files: string[],
  expected: { count: number; width: number; height: number },
): Promise<void> {
  if (files.length !== expected.count) {
    throw new Error(`Slidev a produit ${files.length} images pour ${expected.count} pages.`);
  }
  for (const [index, file] of files.entries()) {
    const metadata = await sharp(file).metadata();
    if (metadata.width !== expected.width || metadata.height !== expected.height) {
      throw new Error(
        `L’image de la page ${index + 1} mesure ${metadata.width ?? '?'}×${metadata.height ?? '?'} au lieu de ${expected.width}×${expected.height}.`,
      );
    }
    if (statSync(file).size === 0) {
      throw new Error(`L’image de la page ${index + 1} est vide.`);
    }
  }
}

// Exported for the staging contract test. The symlinked `node_modules`
// preserves Vite's default `node_modules/.vite` pre-bundle cache across the
// per-build temporary workdirs.
export function stageBuildDir({
  slidesMd,
  themeCss,
  mermaidConfigSource,
  footerEnabled,
  logoPresent,
  mediaFilenames = [],
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
    join(EXPORT_DIR, ARTIFACTS.mermaidRendererSrc),
    join(workdir, ARTIFACTS.setupDir, ARTIFACTS.mermaidRendererDest),
  );
  writeFileSync(
    join(workdir, ARTIFACTS.setupDir, 'mermaidConfig.ts'),
    mermaidConfigSource,
    'utf-8',
  );

  if (existsSync(PUBLIC_FONTS_DIR)) {
    cpSync(PUBLIC_FONTS_DIR, join(workdir, 'public', ARTIFACTS.fonts), {
      recursive: true,
    });
  }

  for (const filename of mediaFilenames) {
    const source = join(MEDIA_DIR, filename);
    if (!existsSync(source)) continue;
    const destination = join(workdir, 'public', 'media', filename);
    mkdirSync(join(destination, '..'), { recursive: true });
    cpSync(source, destination);
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

export type LayoutPreflightCandidate = {
  title: string;
  language?: string | null;
  organisation?: number | { id: number } | null;
  footer?: Partial<FooterConfig> | null;
  slides: unknown[];
  [key: string]: unknown;
};

/**
 * Validate an unpublished candidate with the exact theme, chrome, variables,
 * media staging and DOM validator used by the production build. This is the
 * persistence gate for generated decks; the normal build repeats it as defense
 * in depth after persistence.
 */
// This preflight intentionally coordinates the complete production-equivalent layout validation boundary.
// fallow-ignore-next-line complexity
export async function preflightPresentationLayout(
  payload: Payload,
  candidate: LayoutPreflightCandidate,
): Promise<void> {
  if (candidate.slides.length === 0) return;

  const orgRel = candidate.organisation;
  const orgId = typeof orgRel === 'object' && orgRel ? orgRel.id : orgRel;
  const org = orgId
    ? await payload.findByID({
        collection: COLLECTIONS.organisations,
        id: orgId,
        depth: 1,
      })
    : null;
  const brand = org as (OrgBrand & Record<string, unknown>) | null;
  const template = resolveDocumentTemplate(candidate.documentTemplate);
  const footer = template.chrome.footer ? (candidate.footer ?? undefined) : { enabled: false };
  const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
  const logoUrl =
    template.chrome.logo && logoRel && typeof logoRel === 'object' && logoRel.filename
      ? `/media/${logoRel.filename}`
      : null;
  const language = candidate.language === 'en' ? 'en' : 'fr';
  const vars: Record<string, unknown> = {
    ...candidate,
    organisation: org ?? undefined,
    org: org ?? undefined,
    date: new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR'),
    total: candidate.slides.length,
  };
  const resolvedFooter = footer
    ? {
        ...footer,
        left: resolveVarsWith(footer.left ?? '', vars),
        center: resolveVarsWith(footer.center ?? '', vars),
        right: resolveVarsWith(footer.right ?? '', vars),
      }
    : footer;
  const baseHeadmatter = readFileSync(join(EXPORT_DIR, ARTIFACTS.headmatter), 'utf-8').trim();
  const themedHeadmatter = buildHeadmatter(baseHeadmatter, brand, language);
  const chromeHeadmatter = buildFooterHeadmatter(resolvedFooter, logoUrl);
  const slidesMd = buildSlidesMd(candidate as never, {
    headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
    vars,
  });
  const mediaFilenames = Array.from(
    new Set(slidesMd.matchAll(/(?:src=|image:\s*|:src='"?)["']?(?:\.\/|\/)media\/([^"'\s]+)/g)),
    (match) => match[1],
  );
  const workdir = stageBuildDir({
    slidesMd,
    themeCss: buildThemeCss(brand),
    mermaidConfigSource: buildMermaidConfigSource(brand),
    footerEnabled: Boolean(footer?.enabled),
    logoPresent: Boolean(logoUrl),
    mediaFilenames,
  });

  try {
    await runSlidev(['build', '--base', './'], workdir);
    await validateSlideLayout(workdir, candidate.slides.length);
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

/**
 * Args accepted by runBuildSlidesTask. The task body only ever reads
 * `req.payload`, so script callers can pass a minimal `{ payload }` request
 * instead of faking a full PayloadRequest (which demands context, i18n,
 * headers, user, t, payloadDataLoader…). `input` stays `unknown` because the
 * queue passes its own schema type; the runner narrows it at the boundary.
 * The queue still passes the real PayloadRequest — this widens the accepted
 * type, it doesn't narrow it.
 */
export type BuildSlidesTaskArgs = {
  input: unknown;
  req: Pick<TaskHandlerArgs<'buildSlides'>['req'], 'payload'>;
};

export async function runBuildSlidesTask({ input, req }: BuildSlidesTaskArgs) {
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

    const template = resolveDocumentTemplate(
      (presentation as { documentTemplate?: unknown }).documentTemplate,
    );
    const exportPlan = documentExportPlan(template);
    assertDocumentPages(template, (presentation as { slides?: unknown }).slides);

    const buildId =
      buildToken ?? (presentation as { lastBuildToken?: string }).lastBuildToken ?? randomUUID();

    await patchPresentationBuildMetadata(req.payload, presentationId, {
      lastBuildStatus: BUILD_STATUS.building,
      lastBuildError: '',
      lastBuildToken: buildId,
      spaUrl: null,
      pdfFile: null,
      coverImage: null,
    });
    const initialFingerprint = buildFingerprint(presentation as unknown as Record<string, unknown>);
    const previousArtifactFileIds = artifactFileIds([
      ...(((presentation as { artifacts?: unknown }).artifacts as unknown[]) ?? []),
      { file: presentation.pdfFile },
      { file: presentation.coverImage },
    ]);
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

    const footer = template.chrome.footer
      ? (presentation as { footer?: Partial<FooterConfig> }).footer
      : { enabled: false };
    const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
    const logoUrl =
      template.chrome.logo && logoRel && typeof logoRel === 'object' && logoRel.filename
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
      presentation.language === 'en' ? 'en' : 'fr',
    );
    const chromeHeadmatter = buildFooterHeadmatter(resolvedFooter, logoUrl);
    const slidesMd = buildSlidesMd(renderPresentation as never, {
      headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
      vars,
    });

    const themeCss = buildThemeCss(brand);
    const mermaidConfigSource = buildMermaidConfigSource(brand);
    const mediaFilenames = Array.from(
      new Set(slidesMd.matchAll(/(?:src=|image:\s*|:src='"?)["']?(?:\.\/|\/)media\/([^"'\s]+)/g)),
      (match) => match[1],
    );
    workdir = stageBuildDir({
      slidesMd,
      themeCss,
      mermaidConfigSource,
      footerEnabled: Boolean(footer?.enabled),
      logoPresent: Boolean(logoUrl),
      mediaFilenames,
    });

    const slides =
      (renderPresentation.slides as ({ blockType?: string } & SlideWithMedia)[] | undefined) ?? [];
    const hasMermaid = slides.some((block) => block?.blockType === 'mermaid');
    const hasImages = Boolean(logoUrl) || slides.some(slideHasImages);

    // Use one staged workdir and run the native commands sequentially for
    // deterministic output. The export helper retains the fixed 120s CLI timeout,
    // Mermaid/image settling, and range/per-slide options needed by PNG exports.
    await runSlidev(['build', '--base', './'], workdir);
    await validateSlideLayout(workdir, slides.length);
    // The native Slidev pipeline has a canonical output contract independent
    // from which artifacts a document template exposes: PDF, SPA, and a
    // first-page cover are always produced. Template declarations only select
    // which of those outputs (plus optional per-page images) are persisted.
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
    const needsPageImages = exportPlan.native.pageImages;
    if (slides.length > 0 && needsPageImages) {
      await runSlidev(
        buildSlidevExportArgs({
          output: PAGE_IMAGES_DIR,
          format: 'png',
          hasMermaid,
          hasImages,
          perSlide: true,
        }),
        workdir,
      );
      await assertPageImages(pngPaths(join(workdir, PAGE_IMAGES_DIR)), {
        count: slides.length,
        width: template.canvas.width,
        height: template.canvas.height,
      });
    }

    const latest = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 0,
    });
    if (
      (latest as { lastBuildToken?: string }).lastBuildToken !== buildId ||
      buildFingerprint(latest as unknown as Record<string, unknown>) !== initialFingerprint
    ) {
      req.payload.logger.info(
        `Presentation ${presentationId} changed during build; skipped stale artifact write.`,
      );
      return { output: { success: false, skipped: 'stale' } };
    }

    const outputs: ArtifactOutputs = {};
    if (exportPlan.pdf.length > 0) {
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
      for (const artifact of exportPlan.pdf) {
        outputs[artifact.key] = { file: pdfMedia.id as number | string };
      }
    }
    let coverOutput: ArtifactOutput | undefined;
    if (
      slides.length > 0 &&
      exportPlan.images.some(
        (artifact) => artifact.repeat !== 'per-page' && (artifact.pageIndex ?? 0) === 0,
      )
    ) {
      const coverBuffer = readFileSync(firstPngPath(join(workdir, COVER_DIR)));
      const coverMedia = await req.payload.create({
        collection: COLLECTIONS.media,
        data: {
          alt: `${presentation.title} — couverture`,
          presentation: Number(presentationId),
        },
        file: {
          data: coverBuffer,
          mimetype: 'image/png',
          name: `${randomUUID()}.png`,
          size: coverBuffer.byteLength,
        },
      });
      coverOutput = { file: coverMedia.id as number | string };
    }
    const pageImageOutputs: ArtifactOutput[] = [];
    if (slides.length > 0 && needsPageImages) {
      for (const [pageIndex, file] of pngPaths(join(workdir, PAGE_IMAGES_DIR)).entries()) {
        const buffer = readFileSync(file);
        const media = await req.payload.create({
          collection: COLLECTIONS.media,
          data: {
            alt: `${presentation.title} — page ${pageIndex + 1}`,
            presentation: Number(presentationId),
          },
          file: {
            data: buffer,
            mimetype: 'image/png',
            name: `${randomUUID()}.png`,
            size: buffer.byteLength,
          },
        });
        pageImageOutputs.push({ file: media.id as number | string });
      }
    }
    for (const artifact of exportPlan.images) {
      if (artifact.repeat === 'per-page') {
        outputs[artifact.key] = pageImageOutputs;
        continue;
      }
      const pageIndex = artifact.pageIndex ?? 0;
      outputs[artifact.key] =
        pageIndex === 0 && coverOutput ? coverOutput : pageImageOutputs[pageIndex];
    }

    const spaTargetDir = spaDir(slug);
    rmSync(spaTargetDir, { recursive: true, force: true });
    cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });
    for (const artifact of exportPlan.web) {
      outputs[artifact.key] = { url: spaUrl(slug) };
    }
    const artifactPatch = presentationArtifactPatch(template, buildId, outputs, slides.length);
    const patchData: Record<string, unknown> = {
      lastBuildStatus: BUILD_STATUS.success,
      lastBuildError: '',
      ...artifactPatch,
    };

    await patchPresentationBuildMetadata(req.payload, presentationId, patchData);

    const currentArtifactFileIds = new Set(artifactFileIds(artifactPatch.artifacts));
    for (const previousFileId of previousArtifactFileIds) {
      if (currentArtifactFileIds.has(previousFileId)) continue;
      await req.payload
        .delete({
          collection: COLLECTIONS.media,
          id: previousFileId,
          overrideAccess: true,
        })
        .catch((err) =>
          req.payload.logger.warn(`Failed to delete old artifact ${previousFileId}: ${err}`),
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
