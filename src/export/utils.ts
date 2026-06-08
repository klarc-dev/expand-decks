const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

import { K } from './classNames';

const HTML_ENTITY_RE = /[&<>"']/g;
const DEF_RE = /\{\{def:(.+?)\}\}/g;

// Null-safe: freshly added admin blocks have empty required fields, and the
// live preview renders them immediately — never crash on missing text.
export function escape(text: string | null | undefined): string {
  return (text ?? '').replace(HTML_ENTITY_RE, (ch) => HTML_ENTITIES[ch] ?? ch);
}

// opts reproduce per-renderer variants byte-for-byte: indent (leading spaces
// before <div>), extraClass (e.g. CTA dark), multiline (text on its own line).
export function eyebrow(
  text: string | null | undefined,
  marginClass = 'mb-8',
  opts?: { indent?: string; extraClass?: string; multiline?: boolean },
): string {
  if (!text) return '';
  const indent = opts?.indent ?? '';
  const cls = `${K.eyebrow}${opts?.extraClass ? ` ${opts.extraClass}` : ''} ${marginClass}`;
  const inner = opts?.multiline ? `\n  ${escape(text)}\n` : escape(text);
  return `\n${indent}<div class="${cls}">${inner}</div>`;
}

// Serialize a string as a YAML scalar, double-quoting only when the value
// contains characters that could break — or inject keys into — the slide's
// frontmatter (quote, colon, newline, leading indicator…). Plain tokens like
// `cover` or `image-right` stay unquoted so downstream layout detection (which
// matches `layout === 'cover'`) keeps working. Defends against author titles
// such as `Foo"\nlayout: x`.
const YAML_PLAIN_RE = /^[A-Za-z0-9/](?:[A-Za-z0-9 _.\-/]*[A-Za-z0-9_.\-/])?$/;

function yamlEscapeQuoted(value: string): string {
  const esc = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  return `"${esc}"`;
}

export function yamlScalar(s: string | null | undefined): string {
  const value = s ?? '';
  if (value !== '' && YAML_PLAIN_RE.test(value) && !value.includes('  ')) {
    return value;
  }
  return yamlEscapeQuoted(value);
}

// Always double-quoted — used for the deck title, which is wrapped in quotes by
// convention in hand-written Slidev headmatter.
export function yamlQuoted(s: string | null | undefined): string {
  return yamlEscapeQuoted(s ?? '');
}

let _slideDefs: string[] = [];

export function resetDefs(): void {
  _slideDefs = [];
}

function consumeDefFooter(): string {
  if (_slideDefs.length === 0) return '';
  const items = _slideDefs
    .map((d, i) => `<span class="${K.defItem}"><sup>${i + 1}</sup>${escape(d)}</span>`)
    .join('');
  _slideDefs = [];
  return `\n\n<div class="${K.defFooter}">${items}</div>`;
}

/**
 * Inline markdown → HTML. Supports **bold**, *italic*, [text](url), and
 * {{def:content}} which collects definitions for the slide-level footnote band
 * and emits a superscript reference inline.
 */
// Allow only safe link targets. Browsers ignore leading control chars/whitespace
// in href, so `\njavascript:` still executes — strip control chars and lowercase
// before testing the scheme, then emit the original (already entity-escaped) URL.
function safeHref(raw: string): string | null {
  const probe = raw.trim().replace(/[\x00-\x1f]/g, '').toLowerCase();
  if (/^(https?:|mailto:)/.test(probe)) return raw;
  if (!/^[a-z][a-z0-9+.-]*:/.test(probe)) return raw;
  return null;
}

export function md(text: string | null | undefined): string {
  const escaped = escape(text).replace(DEF_RE, (_, content) => {
    _slideDefs.push(content);
    return `\x00DEF${_slideDefs.length}\x00`;
  });
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_m, label, url) => {
      const href = safeHref(url);
      return href ? `<a href="${href}">${label}</a>` : label;
    })
    .replace(/\x00DEF(\d+)\x00/g, (_m, n) => `<sup class="${K.defRef}">${n}</sup>`);
}

export const STAGGER_DELAY_MS = 100;
export function vMotion(_index: number): string {
  return '';
}

export type Surface = 'dark' | 'light' | 'gradient';

export function surfaceClass(surface?: Surface | null): string {
  return surface === 'light' ? 'relative' : `relative ${K.dark}`;
}

/**
 * Derive a grid utility class for a column count, clamped to the [2,4] range
 * actually defined in style.css. There is no `.k-grid-1` rule, so a single
 * item must still land in a styled 2-col grid rather than an unstyled element.
 */
export function gridClass(n: number): string {
  return `k-grid-${Math.min(Math.max(n, 2), 4)}`;
}

export type SlideImage = {
  url: string;
  position?: 'right' | 'left' | null;
};

export type WrapSlideOptions = {
  layout?: string;
  classAttr?: string;
  surface?: Surface | null;
  hideChrome?: boolean;
  image?: SlideImage | null;
  body: string;
};

/**
 * Wrap a slide body with frontmatter (layout, class, hideChrome flag) and
 * append the slide-scoped def-footer. The brand header / page indicator are
 * rendered globally by global-top.vue / global-bottom.vue; this helper only
 * sets the `hideChrome: true` frontmatter flag for full-bleed slides.
 *
 * When `image.url` is set, the layout is overridden to Slidev's built-in
 * `image-right` or `image-left` and an `image: <url>` field is emitted in the
 * frontmatter. The body still occupies the content half of the slide.
 */
export function wrapSlide({
  layout = 'default',
  classAttr,
  surface,
  hideChrome,
  image,
  body,
}: WrapSlideOptions): string {
  const cls = classAttr ?? (surface ? surfaceClass(surface) : 'relative');
  const chromeFlag = hideChrome ? '\nhideChrome: true' : '';
  const effectiveLayout = image?.url
    ? `image-${image.position ?? 'right'}`
    : layout;
  const imageLine = image?.url ? `\nimage: ${yamlScalar(image.url)}` : '';
  return `---
layout: ${yamlScalar(effectiveLayout)}
class: ${yamlScalar(cls)}${imageLine}${chromeFlag}
---

${body}${consumeDefFooter()}`;
}
