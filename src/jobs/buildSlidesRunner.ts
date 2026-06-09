import { execFile as execFileCb } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
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
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { ARTIFACTS, MEDIA_DIR, PUBLIC_FONTS_DIR, spaDir, spaUrl } from '../lib/paths';
import { SLUG_RE } from '../lib/slug';
import { BUILD_STATUS } from '../lib/status';

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

function stageBuildDir({ slidesMd, themeCss, footerEnabled, logoPresent }: StageOptions): string {
  const workdir = mkdtempSync(join(tmpdir(), 'slidev-build-'));

  symlinkSync(join(SLIDEV_WORKSPACE, 'node_modules'), join(workdir, 'node_modules'), 'dir');
  if (existsSync(MEDIA_DIR)) {
    symlinkSync(MEDIA_DIR, join(workdir, 'media'), 'dir');
  }

  writeFileSync(join(workdir, ARTIFACTS.slidesMd), slidesMd, 'utf-8');

  const baseCss = readFileSync(join(EXPORT_DIR, ARTIFACTS.styleCss), 'utf-8');
  writeFileSync(join(workdir, ARTIFACTS.styleCss), `${baseCss}\n${themeCss}`, 'utf-8');

  cpSync(join(EXPORT_DIR, ARTIFACTS.headmatter), join(workdir, ARTIFACTS.headmatter));

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
  const { presentationId } = input as { presentationId: string };
  let workdir: string | null = null;

  try {
    await req.payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { lastBuildStatus: BUILD_STATUS.building, lastBuildError: '' },
      context: { [CTX.skipBuildQueue]: true },
    });

    const presentation = await req.payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      depth: 0,
    });

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

    const footer = (presentation as { footer?: Partial<FooterConfig> }).footer;
    const logoRel = brand?.logo as { filename?: string } | number | null | undefined;
    const logoUrl =
      logoRel && typeof logoRel === 'object' && logoRel.filename
        ? `/media/${logoRel.filename}`
        : null;
    const chromeVars = {
      'org.name': (brand?.name as string) ?? '',
      title: presentation.title as string,
      date: new Date().toLocaleDateString(presentation.language === 'en' ? 'en-GB' : 'fr-FR'),
    };

    const baseHeadmatter = readFileSync(join(EXPORT_DIR, ARTIFACTS.headmatter), 'utf-8').trim();
    const themedHeadmatter = buildHeadmatter(
      baseHeadmatter,
      brand,
      presentation.language as string | undefined,
    );
    const chromeHeadmatter = buildFooterHeadmatter(footer, chromeVars, logoUrl);
    const slidesMd = buildSlidesMd(presentation as never, {
      headmatter: `${themedHeadmatter}\n${chromeHeadmatter}`.trimEnd(),
    });

    workdir = stageBuildDir({
      slidesMd,
      themeCss: buildThemeCss(brand),
      footerEnabled: Boolean(footer?.enabled),
      logoPresent: Boolean(logoUrl),
    });

    await runSlidev(['build', '--base', './'], workdir);
    await runSlidev(['export', '--format', 'pdf', '--output', ARTIFACTS.pdf], workdir);

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

    const spaTargetDir = spaDir(slug);
    rmSync(spaTargetDir, { recursive: true, force: true });
    cpSync(join(workdir, ARTIFACTS.dist), spaTargetDir, { recursive: true });

    await req.payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: {
        pdfFile: pdfMedia.id,
        spaUrl: spaUrl(slug),
        lastBuildStatus: BUILD_STATUS.success,
        lastBuildError: '',
      },
      context: { [CTX.skipBuildQueue]: true },
    });

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
