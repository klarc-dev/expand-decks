import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

import { NextResponse } from 'next/server';

import { spaDir, INDEX_HTML } from '@/lib/paths';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

/**
 * Serve one file of a built Slidev SPA from media/spa/<slug>/.
 *
 * Traversal-safe: rejects '..' and absolute segments, and re-checks the
 * resolved path stays inside the slug's SPA directory. An empty path serves
 * index.html. Returns 403 on traversal attempts, 404 when the file is absent.
 */
export async function serveSpaFile(
  slug: string,
  pathSegments: string[],
): Promise<NextResponse> {
  const filePath = pathSegments.length > 0 ? pathSegments.join('/') : INDEX_HTML;

  // Prevent path traversal — reject '..' and absolute segments
  if (filePath.includes('..') || pathSegments.some((s) => s.startsWith('/'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const spaRoot = spaDir(slug);
  const absolutePath = resolve(spaRoot, filePath);

  // Double-check resolved path stays within the SPA directory
  if (!absolutePath.startsWith(spaRoot)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const content = await readFile(absolutePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // index.html must revalidate so rebuilds show up immediately; the
    // hash-named assets it references are safe to cache aggressively.
    const cacheControl =
      ext === '.html'
        ? 'no-cache'
        : 'public, max-age=3600, immutable';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
