/**
 * Dynamic `{path}` variable resolution — the SSOT for "insert a field of the
 * current presentation (or its linked organisation) into slide copy".
 *
 * The populated document IS the variable registry: resolution is a generic
 * deep-path lookup (`{org.name}`, `{title}`, `{organisation.name}`…), and the
 * `@`-menu list is derived from an explicit public-field allow-list. Variable
 * resolution remains generic, while new collection fields stay out of the
 * authoring menu until deliberately exposed here.
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

/** Validate a resolved copy without changing stored content or resolving twice
 * during HTML emission. Traverses JSON slide data, including Lexical text nodes. */
export function resolvedVarsForValidation(value: unknown): unknown {
  if (typeof value === 'string') return resolveVars(value);
  if (Array.isArray(value)) return value.map(resolvedVarsForValidation);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolvedVarsForValidation(entry)]),
    );
  return value;
}

// ---------------------------------------------------------------------------
// flattenVars — derive the `@`-menu list from a populated document. The menu is
// intentionally allow-listed by collection so schema additions never expose
// infrastructure metadata, secrets, visual settings, or relationship ids.
// ---------------------------------------------------------------------------

const PRESENTATION_VAR_KEYS = ['title', 'language'] as const;
const ORGANISATION_VAR_KEYS = ['name', 'website', 'bookingUrl'] as const;

export interface VarEntry {
  path: string;
  label: string;
  sample: string;
}

export function flattenVars(doc: Record<string, unknown>, base = ''): VarEntry[] {
  const keys = base === 'org' ? ORGANISATION_VAR_KEYS : PRESENTATION_VAR_KEYS;
  const out: VarEntry[] = [];
  for (const key of keys) {
    const value = doc[key];
    const path = base ? `${base}.${key}` : key;
    if (isPrimitive(value)) {
      out.push({ path, label: path, sample: String(value).slice(0, 60) });
    }
  }
  return out;
}
