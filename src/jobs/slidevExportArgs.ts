const DEFAULT_TIMEOUT_MS = 120_000;
const VISUAL_ASSET_WAIT_MS = 4_000;

export function buildSlidevEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...env,
    // Slidev export boots a Vite dev server. Inheriting the parent Next.js
    // NODE_ENV=production leaves Slidev's __DEV__ compile-time constant
    // undefined, so the client never mounts and Playwright sees a hidden body.
    NODE_ENV: 'development',
    ANTHROPIC_API_KEY: undefined,
    CLIPROXYAPI_KEY: undefined,
  };
}

export type SlidevExportArgsOptions = {
  output: string;
  format?: 'pdf' | 'png';
  hasMermaid: boolean;
  hasImages?: boolean;
  range?: string;
  scale?: number;
};

/**
 * Native single-pass Slidev export: one Chromium navigation to the print route
 * renders every page in a single document, so the settle wait is paid once per
 * export rather than once per slide. Measured on a 28-slide production deck,
 * `--per-slide` cost 116s against 6.6s here for pixel-identical pages, and it
 * also leaked the previous slide's text layer into each page and left `<Link>`
 * destinations unresolved (no page could define the named anchor).
 *
 * The print route must wait for `networkidle`: `load` fires before Slidev has
 * mounted every page and produced a one-page (or blank) document.
 */
export function buildSlidevExportArgs({
  output,
  format = 'pdf',
  hasMermaid,
  hasImages = false,
  range,
  scale,
}: SlidevExportArgsOptions): string[] {
  const args = [
    'export',
    '--format',
    format,
    '--output',
    output,
    '--timeout',
    String(DEFAULT_TIMEOUT_MS),
    '--wait-until',
    'networkidle',
  ];

  if (hasMermaid || hasImages) {
    args.push('--wait', String(VISUAL_ASSET_WAIT_MS));
  }
  if (range) {
    args.push('--range', range);
  }
  if (format === 'png') {
    args.push('--scale', String(scale ?? 1));
  }

  return args;
}
