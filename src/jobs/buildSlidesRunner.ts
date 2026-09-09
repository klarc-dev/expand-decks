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

import type { Payload, TaskHandlerArgs } from 'payload';

import { artifactFileIds, presentationArtifactPatch } from '../documents/artifacts';
import { resolveDocumentTemplate } from '../documents/templates';
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
import {
  MEDIA_PRODUCER_REQUEST_SCHEMA,
  MEDIA_PRODUCER_RESULT_SCHEMA,
  MEDIA_PRODUCER_STATUS,
  MEDIA_PRODUCER_ID,
  MEDIA_PRODUCER_VERSION,
  MEDIA_RESULT_CONTRACT,
  REVIEW_STATUS,
  mediaProducerRelationshipId,
  pendingMediaProducerResult,
  presentationMatchesMediaRequest,
  terminalMediaProducerResult,
  type MediaProducerRequest,
  type MediaProducerResult,
} from '../lib/mediaProducer';
import {
  assertPdfConstraints,
  assertTransportConstraints,
  measurePdfArtifact,
  measurePngArtifact,
  MediaProducerConstraintError,
} from '../lib/mediaProducerArtifact';
import { parseLayoutViolations, SlideLayoutValidationError } from '../lib/slideLayoutValidation';
import { patchPresentationBuildMetadata } from './patchPresentationBuildMetadata';
import { buildSlidevEnv, buildSlidevExportArgs } from './slidevExportArgs';

const execFile = promisify(execFileCb);

const PROJECT_ROOT = join(/* turbopackIgnore: true */ process.cwd());
const SLIDEV_WORKSPACE = join(PROJECT_ROOT, 'slidev-workspace');
const EXPORT_DIR = join(PROJECT_ROOT, 'src', 'export');

const EXEC_TIMEOUT_MS = 5 * 60 * 1000;
const COVER_DIR = 'cover';
const TRANSPORT_DIR = 'transport-pages';
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
  const filename = orderedPngPaths(directory)[0];
  if (!filename) throw new Error('Slidev did not generate a cover PNG');
  return filename;
}

export function orderedPngPaths(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => entry.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filename) => join(directory, filename));
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
  const footer = candidate.footer ?? undefined;
  const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
  const logoUrl =
    logoRel && typeof logoRel === 'object' && logoRel.filename
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

type ProducerTaskInput = {
  mediaProductionRequestId: string;
  mediaRequestId: string;
  publicationId: string;
  revisionSha256: string;
};

type ProducerBinding = ProducerTaskInput & {
  request: MediaProducerRequest;
  identity: {
    request_id: string;
    publication_id: string;
    revision_sha256: string;
    presentation_id: string | number;
  };
};

async function patchMediaProductionRequest(
  payload: Payload,
  requestRecordId: string,
  status: (typeof MEDIA_PRODUCER_STATUS)[keyof typeof MEDIA_PRODUCER_STATUS],
  result: MediaProducerResult,
) {
  await payload.update({
    collection: COLLECTIONS.mediaProductionRequests,
    id: requestRecordId,
    data: { status, result },
    overrideAccess: true,
    depth: 0,
  });
}

export async function commitMediaProductionSuccess(
  payload: Payload,
  binding: ProducerBinding,
  result: MediaProducerResult,
): Promise<boolean> {
  const updated = await payload.update({
    collection: COLLECTIONS.mediaProductionRequests,
    where: {
      and: [
        { id: { equals: binding.mediaProductionRequestId } },
        { requestId: { equals: binding.mediaRequestId } },
        { publicationId: { equals: binding.publicationId } },
        { revisionSha256: { equals: binding.revisionSha256 } },
        { status: { equals: MEDIA_PRODUCER_STATUS.building } },
      ],
    },
    data: { status: MEDIA_PRODUCER_STATUS.succeeded, result },
    overrideAccess: true,
    depth: 0,
  });
  return updated.docs.length === 1;
}

async function loadProducerBinding(
  payload: Payload,
  presentation: Record<string, unknown>,
  presentationId: string,
  input: Partial<ProducerTaskInput>,
): Promise<ProducerBinding | null> {
  const values = [
    input.mediaProductionRequestId,
    input.mediaRequestId,
    input.publicationId,
    input.revisionSha256,
  ];
  if (values.every((value) => value === undefined)) return null;
  if (!values.every((value) => typeof value === 'string' && value.length > 0)) {
    throw new Error('Incomplete media producer task identity');
  }

  const record = await payload.findByID({
    collection: COLLECTIONS.mediaProductionRequests,
    id: input.mediaProductionRequestId!,
    depth: 0,
    overrideAccess: true,
  });
  const request = MEDIA_PRODUCER_REQUEST_SCHEMA.parse(record.request);
  const matches =
    record.requestId === input.mediaRequestId &&
    record.publicationId === input.publicationId &&
    record.revisionSha256 === input.revisionSha256 &&
    String(mediaProducerRelationshipId(record.presentation)) === String(presentationId) &&
    String(mediaProducerRelationshipId(presentation.currentMediaProductionRequest)) ===
      String(input.mediaProductionRequestId) &&
    presentationMatchesMediaRequest(presentation, request);
  const identity = {
    request_id: input.mediaRequestId!,
    publication_id: input.publicationId!,
    revision_sha256: input.revisionSha256!,
    presentation_id: presentationId,
  };
  if (!matches) {
    const result = terminalMediaProducerResult(
      identity,
      MEDIA_PRODUCER_STATUS.stale,
      'revision_mismatch',
      'La demande ne correspond plus à la révision courante.',
    );
    await patchMediaProductionRequest(
      payload,
      input.mediaProductionRequestId!,
      MEDIA_PRODUCER_STATUS.stale,
      result,
    );
    return null;
  }
  return { ...(input as ProducerTaskInput), request, identity };
}

// This remains one canonical build transaction so generic and producer exports
// share the same renderer, stale-token checks, uploads, and cleanup boundary.
// fallow-ignore-next-line complexity
export async function runBuildSlidesTask({ input, req }: BuildSlidesTaskArgs) {
  const { presentationId, buildToken, ...producerInput } = input as {
    presentationId: string;
    buildToken?: string;
  } & Partial<ProducerTaskInput>;
  let workdir: string | null = null;
  let producerBinding: ProducerBinding | null = null;
  const createdProducerMediaIds: (string | number)[] = [];

  try {
    const presentation = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 0,
    });
    producerBinding = await loadProducerBinding(
      req.payload,
      presentation as unknown as Record<string, unknown>,
      presentationId,
      producerInput,
    );
    if (producerInput.mediaRequestId && !producerBinding) {
      return {
        output: {
          success: false,
          status: MEDIA_PRODUCER_STATUS.stale,
        },
      };
    }
    if (buildToken && (presentation as { lastBuildToken?: string }).lastBuildToken !== buildToken) {
      req.payload.logger.info(
        `Presentation ${presentationId} has a newer build token; skipped stale job.`,
      );
      let result: MediaProducerResult | undefined;
      if (producerBinding) {
        result = terminalMediaProducerResult(
          producerBinding.identity,
          MEDIA_PRODUCER_STATUS.stale,
          'build_superseded',
          'Un build plus récent a remplacé cette demande.',
        );
        await patchMediaProductionRequest(
          req.payload,
          producerBinding.mediaProductionRequestId,
          MEDIA_PRODUCER_STATUS.stale,
          result,
        );
      }
      return producerBinding
        ? { output: { success: false, status: MEDIA_PRODUCER_STATUS.stale, result } }
        : { output: { success: false, skipped: 'stale' } };
    }

    if (producerBinding) {
      await patchMediaProductionRequest(
        req.payload,
        producerBinding.mediaProductionRequestId,
        MEDIA_PRODUCER_STATUS.building,
        pendingMediaProducerResult(producerBinding.identity, MEDIA_PRODUCER_STATUS.building),
      );
    }

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
    const template = resolveDocumentTemplate(
      (presentation as { documentTemplate?: unknown }).documentTemplate,
    );

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
    await runSlidev(
      buildSlidevExportArgs({
        output: ARTIFACTS.pdf,
        hasMermaid,
        hasImages,
        // Verified against pinned Slidev 52.19.1: its default exporter emitted
        // one PDF page for a two-slide deck. Per-slide mode preserves the
        // exact 1 block -> 1 page invariant; kPage/kTotal are already baked.
        perSlide: true,
      }),
      workdir,
    );
    if (producerBinding) {
      await runSlidev(
        buildSlidevExportArgs({
          output: TRANSPORT_DIR,
          format: 'png',
          hasMermaid,
          hasImages,
          perSlide: true,
        }),
        workdir,
      );
    } else if (slides.length > 0) {
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
      (latest as { lastBuildToken?: string }).lastBuildToken !== buildId ||
      buildFingerprint(latest as unknown as Record<string, unknown>) !== initialFingerprint ||
      (producerBinding &&
        String(
          mediaProducerRelationshipId(
            (latest as { currentMediaProductionRequest?: unknown }).currentMediaProductionRequest,
          ),
        ) !== String(producerBinding.mediaProductionRequestId))
    ) {
      req.payload.logger.info(
        `Presentation ${presentationId} changed during build; skipped stale artifact write.`,
      );
      let result: MediaProducerResult | undefined;
      if (producerBinding) {
        result = terminalMediaProducerResult(
          producerBinding.identity,
          MEDIA_PRODUCER_STATUS.stale,
          'content_changed',
          'La présentation a changé pendant la production.',
        );
        await patchMediaProductionRequest(
          req.payload,
          producerBinding.mediaProductionRequestId,
          MEDIA_PRODUCER_STATUS.stale,
          result,
        );
      }
      return producerBinding
        ? { output: { success: false, status: MEDIA_PRODUCER_STATUS.stale, result } }
        : { output: { success: false, skipped: 'stale' } };
    }

    let coverMediaId: unknown = null;

    const pdfBuffer = readFileSync(join(workdir, ARTIFACTS.pdf));
    const measuredPdf = producerBinding ? await measurePdfArtifact(pdfBuffer, 'pending') : null;
    if (producerBinding && measuredPdf) {
      assertPdfConstraints(measuredPdf, producerBinding.request.constraints.delivery_pdf);
      if (measuredPdf.page_count !== producerBinding.request.pages.length) {
        throw new MediaProducerConstraintError(
          `PDF page count ${measuredPdf.page_count} does not match requested pages ${producerBinding.request.pages.length}`,
        );
      }
    }
    const pdfMedia = await req.payload.create({
      collection: COLLECTIONS.media,
      data: {
        alt: `${presentation.title} — PDF`,
        presentation: Number(presentationId),
        ...(producerBinding && measuredPdf
          ? {
              mediaProductionRequest: Number(producerBinding.mediaProductionRequestId),
              producerContract: MEDIA_RESULT_CONTRACT,
              producerRequestId: producerBinding.mediaRequestId,
              publicationId: producerBinding.publicationId,
              revisionSha256: producerBinding.revisionSha256,
              artifactOrder: measuredPdf.order,
              artifactGroup: 'delivery',
              artifactRole: measuredPdf.role,
              artifactMediaType: measuredPdf.media_type,
              artifactBytes: measuredPdf.bytes,
              artifactSha256: measuredPdf.sha256,
              artifactPageCount: measuredPdf.page_count,
              artifactWidthPx: measuredPdf.width_px,
              artifactHeightPx: measuredPdf.height_px,
            }
          : {}),
      },
      file: {
        data: pdfBuffer,
        mimetype: 'application/pdf',
        name: `${randomUUID()}.pdf`,
        size: pdfBuffer.byteLength,
      },
    });
    if (producerBinding) createdProducerMediaIds.push(pdfMedia.id);

    const measuredTransport = [];
    if (producerBinding) {
      const pngPaths = orderedPngPaths(join(workdir, TRANSPORT_DIR));
      if (pngPaths.length !== producerBinding.request.pages.length) {
        throw new MediaProducerConstraintError(
          `Transport PNG count ${pngPaths.length} does not match requested pages ${producerBinding.request.pages.length}`,
        );
      }
      for (const [index, pngPath] of pngPaths.entries()) {
        const page = producerBinding.request.pages[index]!;
        measuredTransport.push(
          await measurePngArtifact(readFileSync(pngPath), 'pending', index + 1, page.alt_text),
        );
      }
      assertTransportConstraints(
        measuredTransport,
        producerBinding.request.constraints.transport_images,
      );
      if (measuredPdf?.page_count !== measuredTransport.length) {
        throw new MediaProducerConstraintError(
          `PDF page count ${measuredPdf?.page_count} does not match transport image count ${measuredTransport.length}`,
        );
      }

      for (const [index, measured] of measuredTransport.entries()) {
        const pngBuffer = readFileSync(pngPaths[index]!);
        const imageMedia = await req.payload.create({
          collection: COLLECTIONS.media,
          data: {
            alt: measured.alt_text,
            presentation: Number(presentationId),
            mediaProductionRequest: Number(producerBinding.mediaProductionRequestId),
            producerContract: MEDIA_RESULT_CONTRACT,
            producerRequestId: producerBinding.mediaRequestId,
            publicationId: producerBinding.publicationId,
            revisionSha256: producerBinding.revisionSha256,
            artifactOrder: measured.order,
            artifactGroup: 'transport',
            artifactRole: measured.role,
            artifactMediaType: measured.media_type,
            artifactBytes: measured.bytes,
            artifactSha256: measured.sha256,
            artifactPageCount: measured.page_count,
            artifactWidthPx: measured.width_px,
            artifactHeightPx: measured.height_px,
          },
          file: {
            data: pngBuffer,
            mimetype: 'image/png',
            name: `${randomUUID()}.png`,
            size: pngBuffer.byteLength,
          },
        });
        createdProducerMediaIds.push(imageMedia.id);
        measured.handle = imageMedia.id;
      }
    }

    if (producerBinding) {
      const [postUploadPresentation, postUploadRequest] = await Promise.all([
        req.payload.findByID({
          collection: COLLECTIONS.presentations,
          id: presentationId,
          depth: 0,
        }),
        req.payload.findByID({
          collection: COLLECTIONS.mediaProductionRequests,
          id: producerBinding.mediaProductionRequestId,
          depth: 0,
          overrideAccess: true,
        }),
      ]);
      const stillCurrent =
        (postUploadPresentation as { lastBuildToken?: string }).lastBuildToken === buildId &&
        buildFingerprint(postUploadPresentation as unknown as Record<string, unknown>) ===
          initialFingerprint &&
        String(
          mediaProducerRelationshipId(
            (postUploadPresentation as { currentMediaProductionRequest?: unknown })
              .currentMediaProductionRequest,
          ),
        ) === String(producerBinding.mediaProductionRequestId) &&
        postUploadRequest.requestId === producerBinding.mediaRequestId &&
        postUploadRequest.publicationId === producerBinding.publicationId &&
        postUploadRequest.revisionSha256 === producerBinding.revisionSha256;
      if (!stillCurrent) {
        await Promise.all(
          createdProducerMediaIds.map((id) =>
            req.payload.delete({ collection: COLLECTIONS.media, id, overrideAccess: true }),
          ),
        );
        createdProducerMediaIds.length = 0;
        const result = terminalMediaProducerResult(
          producerBinding.identity,
          MEDIA_PRODUCER_STATUS.stale,
          'revision_changed_after_upload',
          'La révision a changé avant la publication du résultat.',
        );
        await patchMediaProductionRequest(
          req.payload,
          producerBinding.mediaProductionRequestId,
          MEDIA_PRODUCER_STATUS.stale,
          result,
        );
        return { output: { success: false, status: MEDIA_PRODUCER_STATUS.stale, result } };
      }
    }

    if (slides.length > 0) {
      const coverBuffer = readFileSync(
        firstPngPath(join(workdir, producerBinding ? TRANSPORT_DIR : COVER_DIR)),
      );
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
      coverMediaId = coverMedia.id;
      if (producerBinding) createdProducerMediaIds.push(coverMedia.id);
    }

    const spaTargetDir = spaDir(slug);
    rmSync(spaTargetDir, { recursive: true, force: true });
    cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });
    const artifactPatch = presentationArtifactPatch(
      template,
      buildId,
      {
        pdf: { file: pdfMedia.id as number | string },
        'web-presentation': { url: spaUrl(slug) },
        ...(coverMediaId ? { 'cover-image': { file: coverMediaId as number | string } } : {}),
      },
      slides.length,
    );
    const patchData: Record<string, unknown> = {
      lastBuildStatus: BUILD_STATUS.success,
      lastBuildError: '',
      ...artifactPatch,
    };

    let producerResult: MediaProducerResult | undefined;
    if (producerBinding && measuredPdf) {
      producerResult = MEDIA_PRODUCER_RESULT_SCHEMA.parse({
        contract: MEDIA_RESULT_CONTRACT,
        producer: MEDIA_PRODUCER_ID,
        producer_version: MEDIA_PRODUCER_VERSION,
        ...producerBinding.identity,
        status: MEDIA_PRODUCER_STATUS.succeeded,
        delivery_artifacts: [{ ...measuredPdf, handle: pdfMedia.id }],
        transport_artifacts: measuredTransport,
        adapter: {
          provider: 'postiz',
          route: 'linkedin_images_to_document',
          settings: {
            post_as_images_carousel: true,
            carousel_name: producerBinding.request.title,
          },
        },
        validation: {
          layout: REVIEW_STATUS.passed,
          visual_review: REVIEW_STATUS.pending,
          editorial_review: REVIEW_STATUS.pending,
        },
        error: null,
      });
      if (!(await commitMediaProductionSuccess(req.payload, producerBinding, producerResult))) {
        await Promise.all(
          createdProducerMediaIds.map((id) =>
            req.payload.delete({ collection: COLLECTIONS.media, id, overrideAccess: true }),
          ),
        );
        createdProducerMediaIds.length = 0;
        const stale = terminalMediaProducerResult(
          producerBinding.identity,
          MEDIA_PRODUCER_STATUS.stale,
          'request_superseded_before_commit',
          'La demande a été remplacée avant la validation finale du résultat.',
        );
        return {
          output: { success: false, status: MEDIA_PRODUCER_STATUS.stale, result: stale },
        };
      }
    }

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

    return producerBinding
      ? {
          output: {
            success: true,
            status: MEDIA_PRODUCER_STATUS.succeeded,
            result: producerResult,
          },
        }
      : { output: { success: true } };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await patchPresentationBuildMetadata(req.payload, presentationId, {
      lastBuildStatus: BUILD_STATUS.failed,
      lastBuildError: errorMessage.slice(0, 5000),
    });

    if (producerBinding) {
      const result = terminalMediaProducerResult(
        producerBinding.identity,
        MEDIA_PRODUCER_STATUS.failed,
        err instanceof MediaProducerConstraintError ? err.code : 'build_failed',
        errorMessage.slice(0, 5000),
      );
      await patchMediaProductionRequest(
        req.payload,
        producerBinding.mediaProductionRequestId,
        MEDIA_PRODUCER_STATUS.failed,
        result,
      );
    }
    if (createdProducerMediaIds.length > 0) {
      await Promise.all(
        createdProducerMediaIds.map((id) =>
          req.payload
            .delete({ collection: COLLECTIONS.media, id, overrideAccess: true })
            .catch(() => undefined),
        ),
      );
    }

    throw err;
  } finally {
    if (workdir) {
      rmSync(workdir, { recursive: true, force: true });
    }
  }
}
