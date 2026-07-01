const DEFAULT_TIMEOUT_MS = 120_000;
const VISUAL_ASSET_WAIT_MS = 4_000;

type WaitUntil = 'networkidle' | 'load' | 'domcontentloaded' | 'none';

export type SlidevExportArgsOptions = {
  output: string;
  format?: 'pdf' | 'png';
  hasMermaid: boolean;
  hasImages?: boolean;
  perSlide?: boolean;
  range?: string;
  timeoutMs?: number;
  withToc?: boolean;
};

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildSlidevExportArgs({
  output,
  format = 'pdf',
  hasMermaid,
  hasImages = false,
  perSlide = false,
  range,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  withToc = false,
}: SlidevExportArgsOptions): string[] {
  const hasAsyncVisualAssets = hasMermaid || hasImages;
  const waitUntil: WaitUntil = hasAsyncVisualAssets ? 'networkidle' : 'load';
  const args = [
    'export',
    '--format',
    format,
    '--output',
    output,
    '--timeout',
    String(timeoutMs),
    '--wait-until',
    waitUntil,
  ];

  if (hasAsyncVisualAssets) {
    args.push('--wait', String(VISUAL_ASSET_WAIT_MS));
  }
  if (range) {
    args.push('--range', range);
  }
  if (withToc) {
    args.push('--with-toc');
  }
  if (perSlide) {
    args.push('--per-slide');
  }

  return args;
}
