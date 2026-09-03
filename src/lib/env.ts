const isProd = process.env.NODE_ENV === 'production';

/**
 * Require an env var in production, fall back to a dev-only default elsewhere.
 *
 * A missing secret/DB URL in production is a security incident waiting to
 * happen: a guessable PAYLOAD_SECRET lets anyone forge a valid admin JWT, and a
 * blank DATABASE_URL defers a clear config error into an opaque adapter crash.
 * Fail fast at boot instead.
 */
function requiredInProd(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(
      `Missing required environment variable ${name}. Refusing to boot in production with an insecure default.`,
    );
  }
  return devFallback;
}

export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || '4317'}`;

export const PAYLOAD_SECRET = requiredInProd('PAYLOAD_SECRET', 'dev-secret-payload');

export const DATABASE_URL = requiredInProd(
  'DATABASE_URL',
  'postgresql://localhost:5432/slides_dev',
);

/**
 * Google Fonts Webfonts API key. The value is deliberately NOT exported: this
 * module is imported by client components, so only the server-only
 * `src/lib/googleFonts.ts` reads the key. This assertion runs at boot
 * (`payload.config.ts`) so a missing key fails immediately in production rather
 * than at the first deck build — the font catalog has no offline substitute.
 */
export function assertGoogleFontsKey(): void {
  requiredInProd('GOOGLE_FONTS_API_KEY', 'unset-in-dev');
}

/**
 * Payload's Postgres adapter auto-pushes schema in non-production by default.
 * Keep it opt-in: one-off scripts should never block on destructive schema
 * prompts or hold DB sessions while waiting for terminal input.
 */
export const PAYLOAD_DB_PUSH = process.env.PAYLOAD_DB_PUSH === '1';
