import { createHash } from 'node:crypto';

type PreviewResponse = {
  chrome: unknown;
  preview: unknown;
};

type CacheEntry = {
  expiresAt: number;
  value: PreviewResponse;
};

const DEFAULT_TTL_MS = 2_000;
const cache = new Map<string, CacheEntry>();
let now = () => Date.now();

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, stable(val)]),
  );
}

export function buildPreviewResponseCacheKey(input: {
  block: Record<string, unknown>;
  blockTypes?: string[];
  fields: Record<string, unknown>;
  previewFieldPath: string;
  sections?: string[];
  slideIndex?: number;
  userId: string | number;
}): string {
  return createHash('sha256')
    .update(JSON.stringify(stable(input)))
    .digest('hex');
}

export function getPreviewResponse(key: string): PreviewResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setPreviewResponse(
  key: string,
  value: PreviewResponse,
  ttlMs = DEFAULT_TTL_MS,
): PreviewResponse {
  cache.set(key, { value, expiresAt: now() + ttlMs });
  return value;
}

export function __resetPreviewResponseCacheForTests(): void {
  cache.clear();
  now = () => Date.now();
}

export function __setPreviewResponseNowForTests(nextNow: () => number): void {
  now = nextNow;
}
