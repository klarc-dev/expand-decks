const DEFAULT_TIMEOUT_MS = 120_000;
const MERMAID_WAIT_MS = 4_000;

type WaitUntil = 'networkidle' | 'load' | 'domcontentloaded' | 'none';

export type SlidevExportArgsOptions = {
  output: string;
  hasMermaid: boolean;
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
  hasMermaid,
  perSlide = false,
  range,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  withToc = false,
}: SlidevExportArgsOptions): string[] {
  const waitUntil: WaitUntil = hasMermaid ? 'networkidle' : 'load';
  const args = [
    'export',
    '--format',
    'pdf',
    '--output',
    output,
    '--timeout',
    String(timeoutMs),
    '--wait-until',
    waitUntil,
  ];

  if (hasMermaid) {
    args.push('--wait', String(MERMAID_WAIT_MS));
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
