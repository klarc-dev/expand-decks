import { contentSha256 } from './types';

const DEFAULT_MAX_RESULT_BYTES = 100_000;
const BLOCKED_KEYS =
  /^(?:__proto__|prototype|constructor|_meta|api[-_]?key|authorization|cookie|password|secret|token|access[-_]?token|refresh[-_]?token)$/i;
const BINARY_KEY = /(?:base64|blob|binary|imageData|audioData|fileData)$/i;
const MAX_DEPTH = 10;
const MAX_KEYS = 200;
const MAX_ARRAY = 500;

type Toolsets = Record<string, Record<string, unknown>>;

export function filterAllowedToolsets(
  toolsets: unknown,
  sources: readonly { id: string; allowedTools: readonly string[] }[],
): Toolsets {
  const available = (toolsets ?? {}) as Toolsets;
  return Object.fromEntries(
    sources.map((source) => {
      const sourceTools = available[source.id] ?? {};
      const missing = source.allowedTools.filter((name) => !(name in sourceTools));
      if (missing.length) {
        throw new Error(
          `Source ${source.id} did not advertise allowed tool(s): ${missing.join(', ')}`,
        );
      }
      return [
        source.id,
        Object.fromEntries(source.allowedTools.map((name) => [name, sourceTools[name]])),
      ];
    }),
  );
}

export type SanitizedToolResult = {
  trust: 'untrusted-source-data';
  data: unknown;
  excerpt: string;
  contentSha256: string;
  truncated: boolean;
};

function cleanString(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function normalize(
  value: unknown,
  state: { seen: WeakSet<object>; truncated: boolean },
  depth = 0,
): unknown {
  if (depth > MAX_DEPTH) {
    state.truncated = true;
    return '[depth-limit]';
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return cleanString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined') return null;
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new Error(`Unsupported MCP result value: ${typeof value}`);
  }
  if (!value || typeof value !== 'object') return String(value);
  if (state.seen.has(value)) throw new Error('Cyclic MCP tool result');
  state.seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY) state.truncated = true;
      return value.slice(0, MAX_ARRAY).map((item) => normalize(item, state, depth + 1));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('MCP tool result must contain only plain JSON records');
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !BLOCKED_KEYS.test(key) && !BINARY_KEY.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
    if (entries.length > MAX_KEYS) state.truncated = true;
    return Object.fromEntries(
      entries.slice(0, MAX_KEYS).map(([key, item]) => [key, normalize(item, state, depth + 1)]),
    );
  } finally {
    state.seen.delete(value);
  }
}

function truncateUtf8(value: string, maxBytes: number): { value: string; truncated: boolean } {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length <= maxBytes) return { value, truncated: false };
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return { value: bytes.subarray(0, end).toString('utf8'), truncated: true };
}

function excerptFrom(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'excerpt', 'summary', 'title']) {
      if (typeof record[key] === 'string' && record[key].trim()) return record[key];
    }
  }
  return JSON.stringify(value);
}

export function sanitizeToolResult(
  result: unknown,
  opts: { maxBytes?: number } = {},
): SanitizedToolResult {
  const state = { seen: new WeakSet<object>(), truncated: false };
  const normalized = normalize(result, state);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_RESULT_BYTES;
  const serialized = JSON.stringify(normalized);
  const bounded = truncateUtf8(serialized, maxBytes);
  let data: unknown;
  if (bounded.truncated) {
    data = { truncated: true, excerpt: bounded.value };
  } else {
    data = JSON.parse(bounded.value);
  }
  const canonical = JSON.stringify(data);
  const excerpt = truncateUtf8(excerptFrom(data), Math.min(maxBytes, 20_000)).value;
  return {
    trust: 'untrusted-source-data',
    data,
    excerpt,
    contentSha256: contentSha256(canonical),
    truncated: state.truncated || bounded.truncated,
  };
}

export function sourceIdForTool(
  toolName: string,
  sourceIds: readonly string[],
): string | undefined {
  return [...sourceIds]
    .sort((a, b) => b.length - a.length)
    .find(
      (id) => toolName === id || toolName.startsWith(`${id}_`) || toolName.startsWith(`${id}.`),
    );
}
