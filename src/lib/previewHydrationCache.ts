type CacheScope = {
  collection: string;
  depth: number;
  id: string | number;
  userId: string | number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const DEFAULT_TTL_MS = 5_000;
const cache = new Map<string, CacheEntry<unknown>>();
let now = () => Date.now();

function key(scope: CacheScope): string {
  return [scope.userId, scope.collection, scope.id, scope.depth].map(String).join(':');
}

export function getPreviewHydrationSnapshot<T>(scope: CacheScope): T | null {
  const entry = cache.get(key(scope));
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cache.delete(key(scope));
    return null;
  }
  return entry.value as T;
}

export function setPreviewHydrationSnapshot<T>(
  scope: CacheScope,
  value: T,
  ttlMs = DEFAULT_TTL_MS,
): T {
  cache.set(key(scope), { value, expiresAt: now() + ttlMs });
  return value;
}

export async function getOrLoadPreviewHydration<T>(
  scope: CacheScope,
  load: () => Promise<T | null>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T | null> {
  const cached = getPreviewHydrationSnapshot<T>(scope);
  if (cached) return cached;
  const loaded = await load();
  if (loaded) setPreviewHydrationSnapshot(scope, loaded, ttlMs);
  return loaded;
}

export function __resetPreviewHydrationCacheForTests(): void {
  cache.clear();
  now = () => Date.now();
}

export function __setPreviewHydrationNowForTests(nextNow: () => number): void {
  now = nextNow;
}
