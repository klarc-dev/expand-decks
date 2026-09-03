/**
 * Server-only Google Fonts catalog client.
 *
 * Wraps the Webfonts Developer API
 * (https://www.googleapis.com/webfonts/v1/webfonts, see Context7
 * /websites/developers_google_fonts) behind a small typed surface with a
 * short-lived in-memory cache.
 *
 * There is deliberately **no silent fallback**: a missing `GOOGLE_FONTS_API_KEY`
 * or a failed fetch throws `GoogleFontsUnavailableError`. Degrading to a
 * two-family stub used to make a misconfigured deployment look healthy while
 * every deck silently rendered with the wrong typography. Callers surface the
 * failure instead (HTTP 503 for the admin picker, a failed build for the AI
 * path). No API key ever crosses to the browser — only resolved family
 * names/metadata do.
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

/** Thrown whenever the live catalog cannot be produced. Never swallowed here. */
export class GoogleFontsUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GoogleFontsUnavailableError';
  }
}

/**
 * Families bundled with the app (`src/export/style.css` ships Gilroy as webfont
 * files). They are always selectable and never fetched — this is a local asset
 * inventory, not a fallback for a broken API key.
 */
export const LOCAL_FONTS: GoogleFont[] = [
  { family: 'Gilroy', category: 'sans-serif', variants: ['regular'], subsets: ['latin'] },
];

export const GOOGLE_FONTS_API_KEY_ENV = 'GOOGLE_FONTS_API_KEY';
const API_BASE = 'https://www.googleapis.com/webfonts/v1/webfonts';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h — the catalog changes slowly.

type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type CacheEntry = { expiresAt: number; value: GoogleFont[] };

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

/**
 * Live Google Fonts catalog.
 *
 * @throws {GoogleFontsUnavailableError} when the API key is unset, the upstream
 * call fails, or the response carries no usable family.
 */
export async function listGoogleFonts(
  opts: { sort?: FontSort; fetchImpl?: FetchLike; ttlMs?: number } = {},
): Promise<GoogleFont[]> {
  if (cache && cache.expiresAt > now()) return cache.value;

  const key = process.env[GOOGLE_FONTS_API_KEY_ENV];
  if (!key) {
    throw new GoogleFontsUnavailableError(
      `${GOOGLE_FONTS_API_KEY_ENV} is not set — the Google Fonts catalog is unavailable.`,
    );
  }

  const doFetch = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await doFetch(buildWebfontsUrl(key, { sort: opts.sort ?? 'popularity' }));
  } catch (err) {
    throw new GoogleFontsUnavailableError(
      `Google Fonts request failed: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  if (!res.ok) {
    throw new GoogleFontsUnavailableError(`Google Fonts API responded ${res.status}.`);
  }

  const fonts = parseFonts(await res.json());
  if (fonts.length === 0) {
    throw new GoogleFontsUnavailableError('Google Fonts API returned no usable font family.');
  }

  cache = { value: fonts, expiresAt: now() + (opts.ttlMs ?? DEFAULT_TTL_MS) };
  return fonts;
}

export function __resetGoogleFontsCacheForTests(): void {
  cache = null;
  now = () => Date.now();
}

export function __setGoogleFontsNowForTests(nextNow: () => number): void {
  now = nextNow;
}
