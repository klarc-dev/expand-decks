/**
 * Dynamic `{path}` variable resolution — the SSOT for "insert a field of the
 * current presentation (or its linked organisation) into slide copy".
 *
 * The populated document IS the variable registry: resolution is a generic
 * deep-path lookup (`{org.name}`, `{title}`, `{organisation.name}`…), and the
 * `@`-menu list is derived by flattening the same document. Adding a field to a
 * collection makes `{thatField}` work with zero code changes here.
 *
 * Build-time only. Mirrors the footnote `_slideDefs` precedent in utils.ts: a
 * module-level context set once per build (setVarDoc), consumed inside the two
 * text→HTML spots (md / applyDefs). Pure module — imports nothing.
 */

type VarCtx = Record<string, unknown>;

let _varCtx: VarCtx | null = null;

/** Set (or clear, with null) the resolution context for the current build. */
export function setVarDoc(ctx: VarCtx | null): void {
  _varCtx = ctx;
}

/**
 * Match `{a.b.c}` tokens. The lookbehind/lookahead make this robust against the
 * footnote `{{def:…}}` syntax: `(?<![{:])` rejects the inner brace of `{{`,
 * `(?!})` rejects the inner brace of `}}`, and the capture class forbids `:`
 * so `def:Source` can never be captured even if alignment slipped.
 */
const VAR_RE = /(?<![{:])\{([a-zA-Z][\w]*(?:\.[\w]+)*)\}(?!})/g;

/** Deep-get a dotted path; returns undefined on any missing/non-object segment. */
export function getPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
}

function isPrimitive(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

/**
 * Replace `{path}` with its resolved value, ONLY when the path resolves to a
 * primitive. Unknown paths, non-primitive values (objects/arrays/null) and
 * `{{def:…}}` footnotes are left untouched. `esc`, when given, escapes each
 * substituted value (defense-in-depth when injecting into already-built HTML).
 */
export function resolveVarsWith(
  text: string,
  ctx: VarCtx | null,
  esc?: (s: string) => string,
): string {
  if (!ctx || !text) return text;
  return text.replace(VAR_RE, (match, path: string) => {
    const v = getPath(ctx, path);
    if (!isPrimitive(v)) return match;
    const s = String(v);
    return esc ? esc(s) : s;
  });
}

/** Resolve against the current build context (set via setVarDoc). */
export function resolveVars(text: string | null | undefined, esc?: (s: string) => string): string {
  return resolveVarsWith(text ?? '', _varCtx, esc);
}

// ---------------------------------------------------------------------------
// flattenVars — derive the `@`-menu list from a populated document. Generic
// walk: a primitive emits one entry; a nested object recurses; arrays and
// unpopulated relation ids (numbers) are skipped so we never emit `{tags.0}`
// or a meaningless `{organisation}`. SKIP prunes known build/internal noise at
// the top level only (nested org fields are all useful).
// ---------------------------------------------------------------------------

const SKIP = new Set([
  'id',
  'slides',
  'footer',
  'createdBy',
  'updatedAt',
  'createdAt',
  'status',
  'tags',
  'lastBuildStatus',
  'lastBuildError',
  'lastBuildRequestedAt',
  'draftStatus',
  'draftEvents',
  'draftRunId',
  'spaUrl',
  'pdfFile',
  'coverImage',
  'buildStatusLive',
  'sizes', // media upload variants, if a relation is ever walked
]);

export interface VarEntry {
  path: string;
  label: string;
  sample: string;
}

export function flattenVars(doc: Record<string, unknown>, base = ''): VarEntry[] {
  const out: VarEntry[] = [];
  for (const [key, value] of Object.entries(doc)) {
    if (!base && SKIP.has(key)) continue; // prune noise at top level only
    const path = base ? `${base}.${key}` : key;
    if (isPrimitive(value)) {
      out.push({ path, label: path, sample: String(value).slice(0, 60) });
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flattenVars(value as Record<string, unknown>, path));
    }
    // arrays + relation-as-number ids are intentionally skipped
  }
  return out;
}
