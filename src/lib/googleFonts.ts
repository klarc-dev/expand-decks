/**
 * Server-only Google Fonts catalog client.
 *
 * Wraps the Webfonts Developer API
 * (https://www.googleapis.com/webfonts/v1/webfonts, see Context7
 * /websites/developers_google_fonts) behind a small typed surface with a
 * short-lived in-memory cache. When `GOOGLE_FONTS_API_KEY` is unset or a fetch
 * fails, callers fall back to the built-in font families so the admin picker,
 * export, and AI paths keep working offline. No API key ever crosses to the
 * browser — only resolved family names/metadata do.
 */

export type FontSort = 'alpha' | 'date' | 'popularity' | 'style' | 'trending';

export type FontAxis = { tag: string; start: number; end: number };

export type GoogleFont = {
  family: string;
  category: string;
  variants: string[];
  subsets: string[];
  axes?: FontAxis[];
};

export type GoogleFontsResult = {
  fonts: GoogleFont[];
  /** true when results came from the live API, false when using the fallback. */
  live: boolean;
  error?: string;
};

/** Built-in families guaranteed available even without an API key or network. */
export const FALLBACK_FONTS: GoogleFont[] = [
  { family: 'Gilroy', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
  { family: 'Roboto', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
];

export const GOOGLE_FONTS_API_KEY_ENV = 'GOOGLE_FONTS_API_KEY';
const API_BASE = 'https://www.googleapis.com/webfonts/v1/webfonts';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h — the catalog changes slowly.

type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type CacheEntry = { expiresAt: number; value: GoogleFontsResult };

let cache: CacheEntry | null = null;
let now = () => Date.now();

export function buildWebfontsUrl(
  key: string,
  opts: { sort?: FontSort; capability?: 'VF' | 'WOFF2' } = {},
): string {
  const params = new URLSearchParams({ key });
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.capability) params.set('capability', opts.capability);
  return `${API_BASE}?${params.toString()}`;
}

function parseFonts(payload: unknown): GoogleFont[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    if (typeof record.family !== 'string') return [];
    return [
      {
        family: record.family,
        category: typeof record.category === 'string' ? record.category : 'sans-serif',
        variants: Array.isArray(record.variants) ? (record.variants as string[]) : [],
        subsets: Array.isArray(record.subsets) ? (record.subsets as string[]) : [],
        axes: Array.isArray(record.axes) ? (record.axes as FontAxis[]) : undefined,
      },
    ];
  });
}

export async function listGoogleFonts(
  opts: { sort?: FontSort; fetchImpl?: FetchLike; ttlMs?: number } = {},
): Promise<GoogleFontsResult> {
  if (cache && cache.expiresAt > now()) return cache.value;

  const key = process.env[GOOGLE_FONTS_API_KEY_ENV];
  if (!key) {
    return { fonts: FALLBACK_FONTS, live: false, error: `${GOOGLE_FONTS_API_KEY_ENV} not set` };
  }

  const doFetch = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  try {
    const res = await doFetch(buildWebfontsUrl(key, { sort: opts.sort ?? 'popularity' }));
    if (!res.ok) {
      return { fonts: FALLBACK_FONTS, live: false, error: `Google Fonts API ${res.status}` };
    }
    const fonts = parseFonts(await res.json());
    const value: GoogleFontsResult = fonts.length
      ? { fonts, live: true }
      : { fonts: FALLBACK_FONTS, live: false, error: 'Empty Google Fonts response' };
    cache = { value, expiresAt: now() + (opts.ttlMs ?? DEFAULT_TTL_MS) };
    return value;
  } catch (err) {
    return {
      fonts: FALLBACK_FONTS,
      live: false,
      error: err instanceof Error ? err.message : 'Google Fonts fetch failed',
    };
  }
}

export function __resetGoogleFontsCacheForTests(): void {
  cache = null;
  now = () => Date.now();
}

export function __setGoogleFontsNowForTests(nextNow: () => number): void {
  now = nextNow;
}
