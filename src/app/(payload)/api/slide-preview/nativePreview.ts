import { randomBytes } from 'node:crypto';
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

type PreviewEntry = { userId: string | number; root: string; expiresAt: number };
const previews = new Map<string, PreviewEntry>();
let now = () => Date.now();

function cleanupExpired(currentTime = now()): void {
  for (const [token, entry] of previews) {
    if (entry.expiresAt <= currentTime) {
      rmSync(entry.root, { recursive: true, force: true });
      previews.delete(token);
    }
  }
}

async function buildNativePreview(
  presentation: Record<string, unknown>,
  slides: Record<string, unknown>[],
  organisation: Record<string, unknown> | null,
  template: DocumentTemplateDefinition,
): Promise<string> {
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
  const workdir = stageBuildDir({
    slidesMd,
    themeCss: buildThemeCss(organisation),
    mermaidConfigSource: buildMermaidConfigSource(organisation),
    footerEnabled: template.chrome.footer,
    logoPresent: hasAnyLogo(logos),
    mediaFilenames: referencedMediaFiles(slidesMd),
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
  while (previews.size >= MAX_PREVIEWS) {
    const oldest = previews.keys().next().value;
    if (!oldest) break;
    const entry = previews.get(oldest);
    if (entry) rmSync(entry.root, { recursive: true, force: true });
    previews.delete(oldest);
  }
  const persisted = Array.isArray(args.presentation.slides)
    ? (args.presentation.slides as Record<string, unknown>[])
    : [];
  const slides =
    persisted.length > 0
      ? persisted.map((slide, index) => (index === args.slideIndex ? args.block : slide))
      : [args.block];
  const root = await buildNativePreview(
    args.presentation,
    slides,
    args.organisation,
    args.template,
  );
  const token = randomBytes(24).toString('base64url');
  const expiresAt = now() + TTL_MS;
  previews.set(token, { userId: args.userId, root, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function nativePreviewUrl(token: string, slideIndex: number): string {
  return `/api/slide-preview/${encodeURIComponent(token)}/#/${slideIndex + 1}`;
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

export function __registerNativePreviewForTests(token: string, entry: PreviewEntry): void {
  previews.set(token, entry);
}

export function __setNativePreviewNowForTests(nextNow: () => number): void {
  now = nextNow;
}
