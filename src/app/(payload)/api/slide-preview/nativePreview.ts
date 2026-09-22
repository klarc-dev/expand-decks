import { createHash, randomBytes } from 'node:crypto';
import { execFile as execFileCb } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { buildSlidesMd } from '@/export/buildSlidesMd';
import {
  buildFooterHeadmatter,
  hasAnyLogo,
  resolveLogoUrls,
  resolveOrgUrl,
  standardFooter,
} from '@/export/chrome';
import { buildMermaidConfigSource } from '@/export/mermaidConfig';
import { referencedMediaFiles } from '@/export/mediaFiles';
import { buildHeadmatter, buildThemeCss } from '@/export/theme';
import { ARTIFACTS } from '@/lib/paths';
import { stageBuildDir } from '@/jobs/buildSlidesRunner';
import { buildSlidevEnv } from '@/jobs/slidevExportArgs';
import type { DocumentTemplateDefinition } from '@/documents/templates';

const execFile = promisify(execFileCb);
const TTL_MS = 5 * 60_000;
const MAX_PREVIEWS = 8;
const SLIDEV_WORKSPACE = join(process.cwd(), 'slidev-workspace');
const EXPORT_DIR = join(process.cwd(), 'src', 'export');
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

type PreviewEntry = {
  userId: string | number;
  root: string;
  expiresAt: number;
  contentHash: string;
};
const previews = new Map<string, PreviewEntry>();
let now = () => Date.now();

// A Slidev build forks Vite/rolldown workers plus Chromium; running several at
// once inside the web container is what OOM-kills next-server. Builds are
// serialised through this chain and identical content reuses a live workdir.
let buildChain: Promise<unknown> = Promise.resolve();
function serialise<T>(job: () => Promise<T>): Promise<T> {
  const run = buildChain.then(job, job);
  buildChain = run.catch(() => undefined);
  return run;
}

function liveEntryFor(contentHash: string): PreviewEntry | undefined {
  for (const entry of previews.values()) {
    if (entry.contentHash === contentHash && entry.expiresAt > now()) return entry;
  }
  return undefined;
}

function cleanupExpired(currentTime = now()): void {
  for (const [token, entry] of previews) {
    if (entry.expiresAt <= currentTime) {
      previews.delete(token);
      if (![...previews.values()].some((other) => other.root === entry.root))
        rmSync(entry.root, { recursive: true, force: true });
    }
  }
}

function stageNativePreview(
  presentation: Record<string, unknown>,
  slides: Record<string, unknown>[],
  organisation: Record<string, unknown> | null,
  template: DocumentTemplateDefinition,
): {
  slidesMd: string;
  themeCss: string;
  mermaidConfigSource: string;
  footerEnabled: boolean;
  logoPresent: boolean;
} {
  const language = presentation.language === 'en' ? 'en' : 'fr';
  const vars = {
    ...presentation,
    organisation: organisation ?? undefined,
    org: organisation ?? undefined,
    date: new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR'),
    total: slides.length,
  };
  const logos = template.chrome.logo ? resolveLogoUrls(organisation) : null;
  const footer = standardFooter(template.chrome.footer, vars, template.chrome.pageNumbers);
  const baseHeadmatter = readFileSync(join(EXPORT_DIR, ARTIFACTS.headmatter), 'utf8').trim();
  const headmatter =
    `${buildHeadmatter(baseHeadmatter, organisation, language)}\n${buildFooterHeadmatter(
      footer,
      logos,
      resolveOrgUrl(organisation),
    )}`.trimEnd();
  const slidesMd = buildSlidesMd({ ...presentation, slides } as never, {
    headmatter,
    vars,
    template,
  });
  return {
    slidesMd,
    themeCss: buildThemeCss(organisation),
    mermaidConfigSource: buildMermaidConfigSource(organisation),
    footerEnabled: template.chrome.footer,
    logoPresent: hasAnyLogo(logos),
  };
}

async function buildNativePreview(staged: ReturnType<typeof stageNativePreview>): Promise<string> {
  const workdir = stageBuildDir({
    ...staged,
    mediaFilenames: referencedMediaFiles(staged.slidesMd),
  });
  try {
    const slidev = join(SLIDEV_WORKSPACE, 'node_modules', '.bin', 'slidev');
    await execFile(slidev, ['build', '--base', './'], {
      cwd: workdir,
      timeout: 120_000,
      maxBuffer: 32 * 1024 * 1024,
      env: buildSlidevEnv(),
    });
    const dist = join(workdir, ARTIFACTS.dist);
    if (!existsSync(join(dist, 'index.html')))
      throw new Error('Slidev preview build produced no index');
    return workdir;
  } catch (error) {
    rmSync(workdir, { recursive: true, force: true });
    throw error;
  }
}

export async function createNativePreview(args: {
  userId: string | number;
  presentation: Record<string, unknown>;
  block: Record<string, unknown>;
  slideIndex: number;
  organisation: Record<string, unknown> | null;
  template: DocumentTemplateDefinition;
}): Promise<{ token: string; expiresAt: string }> {
  cleanupExpired();
  const persisted = Array.isArray(args.presentation.slides)
    ? (args.presentation.slides as Record<string, unknown>[])
    : [];
  const slides =
    persisted.length > 0
      ? persisted.map((slide, index) => (index === args.slideIndex ? args.block : slide))
      : [args.block];
  const staged = stageNativePreview(args.presentation, slides, args.organisation, args.template);
  const contentHash = createHash('sha256')
    .update(staged.slidesMd)
    .update(staged.themeCss)
    .update(staged.mermaidConfigSource)
    .digest('hex');
  const root = await serialise(async () => {
    const live = liveEntryFor(contentHash);
    if (live) return live.root;
    while (previews.size >= MAX_PREVIEWS) {
      const oldest = previews.keys().next().value;
      if (!oldest) break;
      const entry = previews.get(oldest);
      previews.delete(oldest);
      if (entry && ![...previews.values()].some((other) => other.root === entry.root))
        rmSync(entry.root, { recursive: true, force: true });
    }
    return buildNativePreview(staged);
  });
  const token = randomBytes(24).toString('base64url');
  const expiresAt = now() + TTL_MS;
  previews.set(token, { userId: args.userId, root, expiresAt, contentHash });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function nativePreviewUrl(token: string, slideIndex: number): string {
  // Slidev is built with `--base ./`; its assets are relative to the document.
  // Next.js strips a trailing slash from `/<token>/`, which would rebase the
  // assets to `/api/slide-preview/assets/*`, so point at index.html explicitly.
  return `/api/slide-preview/${encodeURIComponent(token)}/index.html#/${slideIndex + 1}`;
}

export async function serveNativePreview(args: {
  token: string;
  userId: string | number;
  pathSegments: string[];
}): Promise<Response> {
  cleanupExpired();
  const entry = previews.get(args.token);
  if (!entry || entry.userId !== args.userId) return new Response('Not found', { status: 404 });
  const requested = args.pathSegments.length ? args.pathSegments.join('/') : 'index.html';
  if (requested.includes('..') || args.pathSegments.some((part) => part.startsWith('/'))) {
    return new Response('Forbidden', { status: 403 });
  }
  const dist = join(entry.root, ARTIFACTS.dist);
  const filePath = resolve(dist, requested);
  const rel = relative(dist, filePath);
  if (rel.startsWith('..') || rel.includes('..')) return new Response('Forbidden', { status: 403 });
  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

export function __resetNativePreviewStoreForTests(): void {
  for (const entry of previews.values()) rmSync(entry.root, { recursive: true, force: true });
  previews.clear();
  now = () => Date.now();
}

export function __registerNativePreviewForTests(
  token: string,
  entry: Omit<PreviewEntry, 'contentHash'> & { contentHash?: string },
): void {
  previews.set(token, { contentHash: token, ...entry });
}

export function __setNativePreviewNowForTests(nextNow: () => number): void {
  now = nextNow;
}
