import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

import { PAGE_CACHE_DIR } from '@/lib/paths';

const SAFE_SEGMENT_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;
const MANIFEST = 'manifest.json';
const CURRENT = 'current';
const TMP_PREFIX = 'tmp-';

export type PdfPageCacheManifest = {
  version: 1;
  hashes: string[];
};

function assertSafeSegment(value: string, label: string): void {
  if (!SAFE_SEGMENT_RE.test(value)) {
    throw new Error(`Invalid ${label} for PDF page cache: ${value}`);
  }
}

function assertInsideCache(path: string): void {
  const rel = relative(PAGE_CACHE_DIR, path);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`PDF page cache path escaped cache root: ${path}`);
  }
}

export { PAGE_CACHE_DIR };

export function deckCacheDir(slug: string, namespace = CURRENT): string {
  assertSafeSegment(slug, 'slug');
  assertSafeSegment(namespace, 'namespace');
  const path = join(PAGE_CACHE_DIR, slug, namespace);
  assertInsideCache(path);
  return path;
}

export function tempCacheNamespace(buildToken: string): string {
  assertSafeSegment(buildToken, 'buildToken');
  return `${TMP_PREFIX}${buildToken}`;
}

export function cachePagePath(slug: string, buildToken: string, pageIndex: number): string {
  return cachePagePathInNamespace(slug, buildToken, pageIndex);
}

export function currentPagePath(slug: string, pageIndex: number): string {
  return cachePagePathInNamespace(slug, CURRENT, pageIndex);
}

export function tempPagePath(slug: string, buildToken: string, pageIndex: number): string {
  return cachePagePathInNamespace(slug, tempCacheNamespace(buildToken), pageIndex);
}

export function cachePagePathInNamespace(
  slug: string,
  namespace: string,
  pageIndex: number,
): string {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new Error(`Invalid pageIndex for PDF page cache: ${pageIndex}`);
  }
  const path = join(deckCacheDir(slug, namespace), `${pageIndex}.pdf`);
  assertInsideCache(path);
  return path;
}

export function readManifest(slug: string): PdfPageCacheManifest | null {
  const path = join(deckCacheDir(slug), MANIFEST);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as PdfPageCacheManifest;
    if (parsed.version !== 1 || !Array.isArray(parsed.hashes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTempManifest(
  slug: string,
  buildToken: string,
  manifest: PdfPageCacheManifest,
): void {
  const dir = deckCacheDir(slug, tempCacheNamespace(buildToken));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2), 'utf-8');
}

export function copyCurrentPageToTemp(slug: string, buildToken: string, pageIndex: number): void {
  const target = tempPagePath(slug, buildToken, pageIndex);
  mkdirSync(deckCacheDir(slug, tempCacheNamespace(buildToken)), { recursive: true });
  copyFileSync(currentPagePath(slug, pageIndex), target);
}

export function tempCacheHasAllPages(slug: string, buildToken: string, pageCount: number): boolean {
  for (let i = 0; i < pageCount; i += 1) {
    if (!existsSync(tempPagePath(slug, buildToken, i))) return false;
  }
  return true;
}

/** Promote only after the runner's stale-token/fingerprint check passes. */
export function promoteTempCache(slug: string, buildToken: string): void {
  const tmp = deckCacheDir(slug, tempCacheNamespace(buildToken));
  const current = deckCacheDir(slug, CURRENT);
  if (!existsSync(tmp)) return;
  const backup = deckCacheDir(slug, 'swap');
  rmSync(backup, { recursive: true, force: true });
  try {
    renameSync(current, backup);
  } catch {
    // No existing current cache.
  }
  renameSync(tmp, current);
  rmSync(backup, { recursive: true, force: true });
}
