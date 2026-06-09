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

// Collect {{def:...}} literals from an HTML string into the slide-scoped
// footnote band and replace each with a superscript reference. Shared by md()
// (plain fields) and richTextToHTML (Lexical fields) so both feed _slideDefs.
// Operates on already-escaped/converted HTML; { } : are not entity-escaped so
// DEF_RE still matches.
export function applyDefs(html: string): string {
  return html
    .replace(DEF_RE, (_, content) => {
      _slideDefs.push(content);
      return `\x00DEF${_slideDefs.length}\x00`;
    })
    .replace(/\x00DEF(\d+)\x00/g, (_m, n) => `<sup class="${K.defRef}">${n}</sup>`);
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

// ---------------------------------------------------------------------------
// Reusable render primitives (U4). Pure, node-free string builders every
// content renderer composes instead of hand-rolling its own header/wrapper/card
// markup. They emit the existing K.* class tokens + the U1 CSS vars, so styling
// lives in style.css and structure lives here once.
// ---------------------------------------------------------------------------

/**
 * Context threaded into every renderer (U5/U8). Carries the resolved slide tone
 * and, for statement, the index-resolved layout variant (used only when the
 * block's own `variant` field is unset — KTD6b).
 */
export type RenderCtx = { surface?: Surface | null; variantIndex?: number };

/**
 * Slide header: eyebrow + title at the shared `--header-top` baseline, optional
 * right-aligned sidebar. `size` picks the heading scale token. Replaces the
 * per-renderer `eyebrow + <hN class="text-Nxl">` blocks.
 */
export function slideHeader(opts: {
  eyebrow?: string | null;
  title: string;
  size?: 'lg' | 'md';
  sidebar?: string;
}): string {
  const eb = eyebrow(opts.eyebrow, 'mb-4', { indent: '    ' });
  const sizeClass = opts.size === 'md' ? 'k-h-md' : 'k-h-lg';
  const heading = `<h2 class="${sizeClass}">${md(opts.title)}</h2>`;
  if (opts.sidebar) {
    return `<div class="flex items-end justify-between mb-10">
  <div>${eb}
    ${heading}
  </div>
  ${opts.sidebar}
</div>`;
  }
  return `<div class="mb-10">${eb}
  ${heading}
</div>`;
}

/** One card box: optional number badge, title, optional rich-body slot. */
export function card(opts: {
  number?: string | null;
  title: string;
  body?: string; // already-converted HTML (richTextToHTML output), or ''
  titleClass?: string;
}): string {
  const num = opts.number ? `\n  <span class="${K.num}">${escape(opts.number)}</span>` : '';
  const h3 = `<h3${opts.titleClass ? ` class="${opts.titleClass}"` : ''}>${escape(opts.title)}</h3>`;
  const body = opts.body ? `\n  <div>${opts.body}</div>` : '';
  return `<div class="${K.card}">${num}\n  ${h3}${body}\n</div>`;
}

/**
 * Lay out pre-rendered card strings as a grid or vertical column, centralizing
 * the one crowding heuristic against the fixed 720px canvas (replaces the two
 * ad-hoc `crowded` blocks in cardGrid/twoCols). Grid 3+ rows, or column 4+
 * cards, gets the tight treatment.
 */
export function cardStack(
  cards: string[],
  opts: { layout: 'grid' | 'column'; cols?: number },
): { html: string; crowded: boolean } {
  const inner = cards.join('\n\n');
  if (opts.layout === 'grid') {
    const cols = Math.min(Math.max(opts.cols ?? 4, 2), 4);
    const rows = Math.ceil(cards.length / cols);
    const crowded = rows > 2;
    // When crowded, also shrink each card box (.k-tight) — trimming only the
    // top padding isn't enough to keep a 3rd row on the 720px canvas.
    const tight = crowded ? ' k-tight' : '';
    return { html: `<div class="${gridClass(cols)}${tight}">\n\n${inner}\n\n</div>`, crowded };
  }
  const crowded = cards.length >= 4;
  const gap = crowded ? 'space-y-2 k-tight' : 'space-y-3';
  return { html: `<div class="${gap}">\n\n${inner}\n\n</div>`, crowded };
}

/**
 * Outer content frame: the single `--content-inset` rail + `--header-top`
 * baseline. Replaces the per-renderer `<div class="px-14 pt-NN [w-full]">`
 * openers. `crowded` shrinks the top padding when content is tall.
 */
export function contentFrame(
  body: string,
  opts?: { crowded?: boolean; wFull?: boolean },
): string {
  const cls = `k-content${opts?.crowded ? ' k-content-tight' : ''}${opts?.wFull ? ' w-full' : ''}`;
  return `<div class="${cls}">\n\n${body}\n\n</div>`;
}

/**
 * Emphasis surface for the `statement` block's variant dispatch (U8) — the only
 * consumer (KTD6c). `align` × `scale` × `accentRule` are driven by statement's
 * four variants; stats/section/cta compose slideHeader + wrapSlide directly.
 * The body sits in a `k-hero-body` column that clamps against the fixed canvas,
 * so a `display`-scale variant with a long body scales/clamps, not overflows.
 */
export function heroFrame(opts: {
  eyebrow?: string | null;
  title: string;
  body?: string; // already-converted HTML
  caption?: string; // in-flow footer caption HTML
  scale: 'hero' | 'display' | 'title';
  align: 'center' | 'left' | 'split';
  surface?: Surface | null;
  accentRule?: boolean;
}): string {
  const eb = eyebrow(opts.eyebrow, 'mb-6');
  const rule = opts.accentRule ? `\n<hr class="${K.divider}"/>` : '';
  const caption = opts.caption
    ? `\n\n<div class="${K.caption} mt-10">\n  ${opts.caption}\n</div>`
    : '';
  const heading = `<h1 class="k-hero-title">\n${md(opts.title)}\n</h1>`;

  if (opts.align === 'split') {
    const left = `<div>${eb}${rule}\n${heading}\n</div>`;
    const right = `<div class="k-hero-body">\n${opts.body ?? ''}\n</div>`;
    const inner = `<div class="${K.split}">\n${left}\n${right}\n</div>${caption}`;
    return wrapSlide({
      layout: 'default',
      surface: opts.surface,
      body: `<div class="k-hero k-hero--${opts.scale} k-hero--left">\n${inner}\n</div>`,
    });
  }

  const bodyBlock = opts.body ? `\n\n<div class="k-hero-body">\n${opts.body}\n</div>` : '';
  const alignClass = opts.align === 'center' ? 'k-hero--center' : 'k-hero--left';
  const inner = `${eb}${rule}\n${heading}${bodyBlock}${caption}`;
  return wrapSlide({
    layout: opts.align === 'center' ? 'center' : 'default',
    surface: opts.surface,
    body: `<div class="k-hero k-hero--${opts.scale} ${alignClass}">\n${inner}\n</div>`,
  });
}
