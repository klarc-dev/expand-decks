const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

import type { DeckLanguage } from '../agents/language';
import { K } from './classNames';
import type { PillVariant } from '../blocks/spec/pillVariants';
export type { PillVariant } from '../blocks/spec/pillVariants';
import { densityClass, type SlideDensity } from './density';
import { resolveVars } from './vars';

const HTML_ENTITY_RE = /[&<>"']/g;
const DEF_RE = /\{\{def:(.+?)\}\}/g;
const NOTE_REF_RE = /\[\^(\d+)\]/g;
const MARK_RE = /(?<!\\)\[([^^[\]\n]+?)(?<!\\)\]/g;

// Null-safe: freshly added admin blocks have empty required fields, and the
// live preview renders them immediately — never crash on missing text.
export function escape(text: string | null | undefined): string {
  return (text ?? '').replace(HTML_ENTITY_RE, (ch) => HTML_ENTITIES[ch] ?? ch);
}

// opts reproduce per-renderer variants byte-for-byte: indent (leading spaces
// before <div>), extraClass (e.g. CTA dark), multiline (text on its own line).
export function eyebrow(
  text: string | null | undefined,
  spacingClass = '',
  opts?: {
    indent?: string;
    extraClass?: string;
    multiline?: boolean;
    variant?: PillVariant | null;
  },
): string {
  if (!text) return '';
  const indent = opts?.indent ?? '';
  const variantClass =
    opts?.variant && opts.variant !== 'default' ? `k-eyebrow--${opts.variant}` : '';
  // A legacy forced-dark class must not override an explicit palette role.
  const extraClass = variantClass
    ? opts?.extraClass
        ?.split(/\s+/)
        .filter((cls) => cls !== K.eyebrowDark)
        .join(' ')
    : opts?.extraClass;
  const classes = [K.eyebrow, variantClass, extraClass, spacingClass].filter(Boolean).join(' ');
  const inner = opts?.multiline ? `\n  ${escape(text)}\n` : escape(text);
  return `\n${indent}<div class="${classes}">${inner}</div>`;
}

/** A wrapping group composes the canonical pill, never a second pill recipe. */
export function eyebrowGroup(
  texts: readonly string[],
  spacingClass = '',
  opts?: { variant?: PillVariant | null },
): string {
  const items = texts.map((text) => eyebrow(text, '', opts)).join('');
  if (!items) return '';
  return `\n<div class="${[K.eyebrowGroup, spacingClass].filter(Boolean).join(' ')}">${items}\n</div>`;
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

const DEF_FOOTER_SLOT = '<!-- k-def-footer-slot -->';

export function defFooterSlot(): string {
  return DEF_FOOTER_SLOT;
}

let _slideDefs: string[] = [];

export function resetDefs(): void {
  _slideDefs = [];
}

/**
 * Seed the slide-scoped footnote band from the shared "Sources / Notes" Payload
 * repeater (block.footnotes). Called by buildSlidesMd before the renderer runs,
 * so authored notes are numbered ahead of any inline `{{def:…}}` refs and both
 * share one continuous numbering in the footer band. Empty/blank texts skipped.
 */
export function seedFootnotes(notes?: ({ text?: string | null } | null)[] | null): void {
  if (!notes) return;
  for (const note of notes) {
    const text = note?.text?.trim();
    if (text) _slideDefs.push(text);
  }
}

function consumeDefFooter(): string {
  if (_slideDefs.length === 0) return '';
  // md() (not escape) so a note can carry an inline [texte](url) link or *emphasis*;
  // md() escapes HTML entities itself, so this stays injection-safe.
  const items = _slideDefs
    .map(
      (d, i) =>
        `<span class="${K.defItem}"><span class="${K.defIndex}">${i + 1}</span><span class="${K.defText}">${md(d)}</span></span>`,
    )
    .join('');
  _slideDefs = [];
  return `\n\n<div class="${K.defFooter}">${items}</div>`;
}

function inlineNoteRefs(html: string): string {
  return html.replace(NOTE_REF_RE, (token, rawNumber) => {
    const number = Number.parseInt(rawNumber, 10);
    if (number < 1 || number > _slideDefs.length) return token;
    return `<sup class="${K.defRef}">${number}</sup>`;
  });
}

/**
 * Inline markdown → HTML. Supports **bold**, *italic*, [text](url), authored
 * footnote references such as [^1], and {{def:content}} definitions. The latter
 * collect their own note and emit a superscript reference inline.
 */
// Allow only safe link targets. Browsers ignore leading control chars/whitespace
// in href, so `\njavascript:` still executes — strip control chars and lowercase
// before testing the scheme, then emit the original (already entity-escaped) URL.
// Shared by md() links, Lexical anchors (richtext.ts) and every renderer that
// turns authored data (CTA actions, contact details) into an <a href>.
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const probe = raw
    .trim()
    .replace(/[\x00-\x1f]/g, '')
    .toLowerCase();
  if (!probe || probe === '#') return null;
  if (/^(https?:|mailto:|tel:)/.test(probe)) return raw;
  if (!/^[a-z][a-z0-9+.-]*:/.test(probe)) return raw;
  return null;
}

/** `tel:` target for a displayed phone number, or null when no digits remain. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 6) return null;
  // Keep a single leading "+" for international numbers; drop any other "+".
  const normalized = (digits.startsWith('+') ? '+' : '') + digits.replace(/\+/g, '');
  return `tel:${normalized}`;
}

// Collect {{def:...}} literals from an HTML string into the slide-scoped
// footnote band and replace each with a superscript reference. Shared by md()
// (plain fields) and richTextToHTML (Lexical fields) so both feed _slideDefs.
// Operates on already-escaped/converted HTML; { } : are not entity-escaped so
// DEF_RE still matches.
export function applyDefs(html: string): string {
  // Resolve {path} variables first (input is already Lexical-converted HTML;
  // `{ } .` are not entity-escaped so VAR_RE still matches). escape() guards
  // each substituted value.
  return inlineNoteRefs(
    resolveVars(html, escape)
      .replace(DEF_RE, (_, content) => {
        _slideDefs.push(content);
        return `\x00DEF${_slideDefs.length}\x00`;
      })
      .replace(/\x00DEF(\d+)\x00/g, (_m, n) => `<sup class="${K.defRef}">${n}</sup>`),
  );
}

export function md(text: string | null | undefined): string {
  // Resolve {path} variables before escaping, so a resolved value is escaped
  // like any author text.
  const escaped = escape(resolveVars(text)).replace(DEF_RE, (_, content) => {
    _slideDefs.push(content);
    return `\x00DEF${_slideDefs.length}\x00`;
  });
  return inlineNoteRefs(
    escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_m, label, url) => {
        const href = safeHref(url);
        return href ? `<a href="${href}">${label}</a>` : label;
      })
      // `[mot]` marks a key term inside a heading (the rose highlighter band, see
      // .k-mark). Runs after links so `[label](url)` is never re-read as a mark;
      // `\[` / `\]` keep a literal bracket.
      .replace(MARK_RE, (_m, content) => `<mark class="${K.mark}">${content}</mark>`)
      .replace(/\\([[\]])/g, '$1')
      .replace(/\x00DEF(\d+)\x00/g, (_m, n) => `<sup class="${K.defRef}">${n}</sup>`),
  );
}

export type Surface = 'dark' | 'light' | 'gradient';

export function surfaceClass(surface?: Surface | null): string {
  if (surface === 'light') return 'relative';
  // Gradient is a distinct dark template surface: k-dark supplies dark-tone
  // variables and k-gradient paints the cover wash on the Slidev root.
  if (surface === 'gradient') return `relative ${K.dark} k-gradient`;
  return `relative ${K.dark}`;
}

/**
 * Derive a grid utility class for a column count, clamped to the [2,4] range
 * actually defined in style.css. A single item gets `.k-grid-1`, centered on
 * the shared content rail instead of being stranded in the left half of a 2-col grid.
 */
export function gridClass(n: number): string {
  return `k-grid-${Math.min(Math.max(n, 1), 4)}`;
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
 * rendered per slide by slide-top.vue / slide-bottom.vue; this helper only
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
  const effectiveLayout = image?.url ? `image-${image.position ?? 'right'}` : layout;
  const imageLine = image?.url ? `\nimage: ${yamlScalar(image.url)}` : '';
  const defFooter = consumeDefFooter();
  const bodyWithFooter = body.includes(DEF_FOOTER_SLOT)
    ? body.replace(DEF_FOOTER_SLOT, defFooter)
    : `${body}${defFooter}`;
  return `---
layout: ${yamlScalar(effectiveLayout)}
class: ${yamlScalar(cls)}${imageLine}${chromeFlag}
---

${bodyWithFooter}`;
}

// ---------------------------------------------------------------------------
// Reusable render primitives (U4). Pure, node-free string builders every
// content renderer composes instead of hand-rolling its own header/wrapper/card
// markup. They emit the existing K.* class tokens + the U1 CSS vars, so styling
// lives in style.css and structure lives here once.
// ---------------------------------------------------------------------------

/**
 * Context threaded into every renderer (U5/U8). Carries the resolved slide tone,
 * for statement the index-resolved layout variant (used only when the block's
 * own `variant` field is unset — KTD6b), and `sections`: the deck's ordered
 * `section` titles, which the agenda block falls back to when its own `items`
 * are empty (auto-plan from the deck structure).
 */
export type RenderCtx = {
  surface?: Surface | null;
  variantIndex?: number;
  sections?: string[];
  /** Deck output language; drives the localized labels a renderer emits. */
  language?: DeckLanguage | null;
};

/**
 * Slide header: eyebrow + title at the shared `--header-top` baseline, optional
 * right-aligned sidebar. `size` picks the heading scale token. Replaces the
 * per-renderer `eyebrow + <hN class="text-Nxl">` blocks.
 */
export function slideHeader(opts: {
  eyebrow?: string | null;
  pillVariant?: PillVariant | null;
  title: string;
  /** Already-converted rich-text HTML: the description line under the title. */
  lead?: string;
  size?: 'lg' | 'md';
  sidebar?: string;
  align?: 'left' | 'center';
  density?: SlideDensity;
}): string {
  const eb = eyebrow(opts.eyebrow, 'k-eyebrow--header', {
    indent: '    ',
    variant: opts.pillVariant,
  });
  const sizeClass = opts.size === 'md' ? 'k-h-md' : 'k-h-lg';
  const headingDensity = densityClass(opts.density ?? 'comfortable');
  const heading = `<h2 class="${[sizeClass, headingDensity].filter(Boolean).join(' ')}">${md(opts.title)}</h2>`;
  // Unified content header: pill + title + description, identical on every
  // content template so the deck reads as one system.
  const lead = opts.lead ? `\n  <div class="${K.headerLead}">${opts.lead}</div>` : '';
  if (opts.sidebar) {
    return `<header class="${K.contentHeader} ${K.contentHeaderSplit}">
  <div>${eb}
    ${heading}${lead}
  </div>
  ${opts.sidebar}
</header>`;
  }
  const alignClass = opts.align === 'center' ? ` ${K.contentHeaderCenter}` : '';
  return `<header class="${K.contentHeader}${alignClass}">${eb}
  ${heading}${lead}
</header>`;
}

/** One card box: optional number badge, title, optional rich-body slot. */
export function card(opts: {
  number?: string | null;
  title: string;
  body?: string; // already-converted HTML (richTextToHTML output), or ''
  titleClass?: string;
}): string {
  const num = opts.number ? `\n  <span class="${K.num}">${escape(opts.number)}</span>` : '';
  const h3 = `<h3${opts.titleClass ? ` class="${opts.titleClass}"` : ''}>${md(opts.title)}</h3>`;
  const body = opts.body ? `\n  <div>${opts.body}</div>` : '';
  const classes = [K.card, opts.number ? K.cardNumbered : ''].filter(Boolean).join(' ');
  return `<div class="${classes}">${num}\n  ${h3}${body}\n</div>`;
}

/** A location uses the slide's own surface; only its directions are interactive.
 * contactHtml is a trusted richTextToHTML fragment, never raw author HTML.
 */
export function locationCard(opts: {
  name: string;
  address: string;
  directionsUrl?: string | null;
  contactHtml?: string;
  language?: DeckLanguage | null;
}): string {
  const name = resolveVars(opts.name) ?? '';
  const address = resolveVars(opts.address) ?? '';
  if (!name.trim() || !address.trim()) return '';
  const href = safeHref(resolveVars(opts.directionsUrl));
  const label = opts.language === 'en' ? 'Directions' : 'Itinéraire';
  const link = href
    ? `<a class="${K.locationDirections}" href="${escape(href)}" aria-label="${escape(`${label} · ${name}`)}">${label}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg></a>`
    : '';
  return `<section class="${K.locationCard}"><div class="${K.locationHeading}"><h3>${escape(name)}</h3>${link}</div><address class="${K.locationAddress}">${escape(address).replace(/\r?\n/g, '<br>')}</address>${opts.contactHtml ? `<div class="${K.locationContact}">${opts.contactHtml}</div>` : ''}</section>`;
}

/** Upgrade the existing closing-note convention without a new domain block or
 * a schema migration. Only complete office rows (bold name · numbered address ·
 * tel/mail contacts) qualify; all other rich notes remain byte-for-byte intact.
 * Input is sanitized richTextToHTML output. Contact markup is retained verbatim.
 */
export function locationCardsFromNote(html: string, language?: DeckLanguage | null): string | null {
  const content = html.trim().replace(/^<div class="payload-richtext">([\s\S]*)<\/div>$/, '$1');
  const paragraphs = content.match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/g);
  if (!paragraphs?.length || paragraphs.length > 2 || paragraphs.join('') !== content) return null;
  const decode = (text: string) =>
    text.replace(
      /&(amp|lt|gt|quot|#39);/g,
      (entity) =>
        ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity] ?? entity,
    );
  const cards: string[] = [];
  for (const paragraph of paragraphs) {
    const match = paragraph.match(
      /^<p(?:\s[^>]*)?><strong>([^<]+)<\/strong>\s*·\s*([^<]+?)\s*·\s*([\s\S]+)<\/p>$/,
    );
    if (!match || !/\d/.test(match[2]!) || !/<a href="(?:tel:|mailto:)/.test(match[3]!))
      return null;
    const name = decode(match[1]!).trim();
    const address = decode(match[2]!).trim();
    const destination = `${address}, ${name}`;
    cards.push(
      locationCard({
        name,
        address,
        language,
        contactHtml: match[3],
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      }),
    );
  }
  return `<div class="${K.locationGrid}">${cards.join('')}</div>`;
}

/**
 * Lay out pre-rendered cards behind one topology and density interface. Callers
 * provide a requested maximum column count; this module owns sparse-grid
 * clamping, five/six-card balancing, row state, final-row centering and tight
 * geometry for the fixed canvas.
 */
export function cardStack(
  cards: string[],
  opts: {
    layout: 'grid' | 'column';
    maxCols?: number;
    density?: SlideDensity;
    dense?: boolean;
  },
): { html: string; crowded: boolean; cols: number; rows: number } {
  if (cards.length === 0) return { html: '', crowded: false, cols: 0, rows: 0 };
  const inner = cards.join('\n\n');
  const density = opts.density ?? 'comfortable';

  if (opts.layout === 'grid') {
    const requested = Math.min(Math.max(opts.maxCols ?? 4, 1), 4);
    const capped = Math.min(requested, cards.length);
    const cols = requested >= 4 && cards.length >= 5 && cards.length <= 6 ? 3 : capped;
    const rows = Math.ceil(cards.length / cols);
    const crowded = rows > 2 || Boolean(opts.dense);
    const centeredLastRow = cols === 3 && cards.length === 5;
    const classes = [
      K.cardStack,
      K.cardStackGrid,
      gridClass(cols),
      rows > 1 ? K.cardStackMultirow : '',
      centeredLastRow ? K.cardStackCenteredLastRow : '',
      crowded ? K.cardStackCrowded : '',
      densityClass(density),
    ]
      .filter(Boolean)
      .join(' ');
    return {
      html: `<div class="${classes}">\n\n${inner}\n\n</div>`,
      crowded,
      cols,
      rows,
    };
  }

  const cols = 1;
  const rows = cards.length;
  const crowded = cards.length >= 4 || Boolean(opts.dense);
  const classes = [
    K.cardStack,
    K.cardStackColumn,
    crowded ? K.cardStackCrowded : '',
    densityClass(density),
  ]
    .filter(Boolean)
    .join(' ');
  return {
    html: `<div class="${classes}">\n\n${inner}\n\n</div>`,
    crowded,
    cols,
    rows,
  };
}

/**
 * Outer content frame: one stable `--header-top` baseline + a measured body row.
 * The main slot can be centered for visual bodies (cards/stats/timeline/agenda),
 * start-aligned for scan-first tables, or stretched for custom full-height bodies.
 */
export function contentFrame(
  main: string,
  opts?: {
    header?: string;
    crowded?: boolean;
    wFull?: boolean;
    mainAlign?: 'center' | 'start' | 'stretch';
    density?: SlideDensity;
  },
): string {
  const cls = [
    K.content,
    opts?.crowded ? K.contentTight : '',
    opts?.wFull ? K.contentFull : '',
    densityClass(opts?.density ?? 'comfortable'),
  ]
    .filter(Boolean)
    .join(' ');
  const align = opts?.mainAlign ?? 'center';
  const alignCls =
    align === 'start'
      ? K.contentMainStart
      : align === 'stretch'
        ? K.contentMainStretch
        : K.contentMainCenter;
  const mainCls = `${K.contentMain} ${alignCls}`;
  const header = opts?.header ? `\n${opts.header}` : '';
  return `<div class="${cls}">${header}
  <div class="${mainCls}">\n\n${main}\n\n  </div>
  ${DEF_FOOTER_SLOT}
</div>`;
}

/** Default cartouche label when a takeaway carries no "Label : …" lead. */
const TAKEAWAY_LABEL: Record<DeckLanguage, string> = {
  fr: 'À retenir',
  en: 'Key takeaway',
};

// A short plain-text lead followed by a colon at the start of the first
// paragraph: `<p>L’enjeu : examiner…</p>`. Tags, entities and digits in the
// lead are rejected so a URL, a time ("10:30") or an emphasised opener never
// becomes a cartouche.
const TAKEAWAY_LEAD_RE = /^(\s*(?:<div[^>]*>\s*)?<p(?:\s[^>]*)?>)\s*([^<>&:\d]{2,40}?)\s*:\s+/;
// First letter of the remaining text, past the opening tags (and any inline
// wrapper such as <strong>), so it can start the sentence with a capital.
const TAKEAWAY_FIRST_LETTER_RE =
  /^(\s*(?:<div[^>]*>\s*)?<p(?:\s[^>]*)?>\s*(?:<[^>]+>\s*)*)(\p{Ll})/u;

/**
 * Split a footer/note HTML into a cartouche label and the remaining text. The
 * lead of a "Label : text" note becomes the label; otherwise the localized
 * default applies and the text is kept whole. Shared by every block that
 * promotes its closing note to a takeaway box (statement, twoCols).
 */
export function splitTakeaway(
  html: string,
  language?: DeckLanguage | null,
): { label: string; html: string } {
  const m = html.match(TAKEAWAY_LEAD_RE);
  if (m) {
    // "L’enjeu : examiner…" was one sentence; once the lead moves into the
    // cartouche, what remains starts a sentence of its own.
    const rest = html
      .replace(TAKEAWAY_LEAD_RE, '$1')
      .replace(
        TAKEAWAY_FIRST_LETTER_RE,
        (_s, open, letter) => `${open}${letter.toLocaleUpperCase('fr')}`,
      );
    return { label: m[2]!, html: rest };
  }
  return { label: TAKEAWAY_LABEL[language ?? 'fr'], html };
}

/**
 * Takeaway box: a tinted panel with a cartouche carrying the label (e.g.
 * "L’enjeu", "À retenir") ahead of the text, so a slide's closing note reads
 * as its key point instead of a footnote. `extraClass` picks the per-block
 * placement (hero caption, twoCols copy column).
 */
export function takeawayBox(html: string, label: string, extraClass = ''): string {
  const classes = [K.caption, extraClass, K.takeaway].filter(Boolean).join(' ');
  return `<div class="${classes}">\n  <span class="${K.takeawayLabel}">${escape(label)}</span>\n  <div class="${K.takeawayText}">\n    ${html}\n  </div>\n</div>`;
}

/** In-flow hero caption; with a label it renders as a takeaway box. */
function heroCaption(captionHtml: string, label?: string): string {
  if (!label) {
    return `\n\n<div class="${K.caption} ${K.heroCaption}">\n  ${captionHtml}\n</div>`;
  }
  return `\n\n${takeawayBox(captionHtml, label, K.heroCaption)}`;
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
  pillVariant?: PillVariant | null;
  title: string;
  body?: string; // already-converted HTML
  caption?: string; // in-flow footer caption HTML
  captionLabel?: string; // cartouche text; turns the caption into a takeaway box
  scale: 'hero' | 'display' | 'title';
  align: 'center' | 'left' | 'split';
  surface?: Surface | null;
  accentRule?: boolean;
  density?: SlideDensity;
}): string {
  const eb = eyebrow(opts.eyebrow, 'k-eyebrow--hero', { variant: opts.pillVariant });
  const rule = opts.accentRule ? `\n<hr class="${K.divider}"/>` : '';
  const caption = opts.caption ? heroCaption(opts.caption, opts.captionLabel) : '';
  const sharedDensityClass = densityClass(opts.density ?? 'comfortable');
  const heading = `<h1 class="${[K.heroTitle, sharedDensityClass].filter(Boolean).join(' ')}">\n${md(opts.title)}\n</h1>`;

  // Split is a two-column layout only when there's a body for the right column;
  // with no body it would emit an empty grid cell, so fall through to the
  // single-column left treatment instead.
  if (opts.align === 'split' && opts.body) {
    const left = `<div>${eb}${rule}\n${heading}\n</div>`;
    const right = `<div class="${K.heroBody}">\n${opts.body}\n</div>`;
    const inner = `<div class="${K.split}">\n${left}\n${right}\n</div>${caption}`;
    return wrapSlide({
      layout: 'default',
      surface: opts.surface,
      body: `<div class="${[K.hero, `k-hero--${opts.scale}`, 'k-hero--left', sharedDensityClass].filter(Boolean).join(' ')}">\n  <div class="${K.heroMain}">\n${inner}\n  </div>\n  ${DEF_FOOTER_SLOT}\n</div>`,
    });
  }

  const bodyBlock = opts.body ? `\n\n<div class="${K.heroBody}">\n${opts.body}\n</div>` : '';
  const alignClass = opts.align === 'center' ? `${K.hero}--center` : `${K.hero}--left`;
  const inner = `${eb}${rule}\n${heading}${bodyBlock}${caption}`;
  return wrapSlide({
    layout: opts.align === 'center' ? 'center' : 'default',
    surface: opts.surface,
    body: `<div class="${[K.hero, `k-hero--${opts.scale}`, alignClass, sharedDensityClass].filter(Boolean).join(' ')}">\n  <div class="${K.heroMain}">\n${inner}\n  </div>\n  ${DEF_FOOTER_SLOT}\n</div>`,
  });
}
