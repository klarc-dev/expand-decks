import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

import { getPayload } from 'payload';
import config from '@payload-config';
import { NextResponse } from 'next/server';

import { resolveShareLink, isLive } from '@/lib/shareLinks';

const MEDIA_DIR = resolve(process.cwd(), 'media');

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

// NOTE: In production, add Next.js middleware rate limiting (e.g. 20 req/min/IP)
// on the /share/ route prefix to prevent brute-force token guessing.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path: pathSegments } = await params;

  const payload = await getPayload({ config });

  const link = await resolveShareLink(payload, token, 1);

  if (!link || !isLive(link)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Resolve presentation slug
  const presentation =
    typeof link.presentation === 'object' ? link.presentation : null;
  if (!presentation?.slug) {
    return new NextResponse('Not found', { status: 404 });
  }

  const slug = presentation.slug as string;
  const filePath = pathSegments.join('/');

  // Prevent path traversal — reject '..' and absolute segments
  if (filePath.includes('..') || pathSegments.some((s) => s.startsWith('/'))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const absolutePath = resolve(MEDIA_DIR, 'spa', slug, filePath);

  // Double-check resolved path stays within the SPA directory
  const spaRoot = resolve(MEDIA_DIR, 'spa', slug);
  if (!absolutePath.startsWith(spaRoot)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const content = await readFile(absolutePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
