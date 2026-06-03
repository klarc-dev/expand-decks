const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_ENTITY_RE = /[&<>"']/g;
const DEF_RE = /\{\{def:(.+?)\}\}/g;

export function escape(text: string): string {
  return text.replace(HTML_ENTITY_RE, (ch) => HTML_ENTITIES[ch] ?? ch);
}

let _slideDefs: string[] = [];

export function resetDefs(): void {
  _slideDefs = [];
}

function consumeDefFooter(): string {
  if (_slideDefs.length === 0) return '';
  const items = _slideDefs
    .map((d, i) => `<span class="k-def-item"><sup>${i + 1}</sup>${escape(d)}</span>`)
    .join('');
  _slideDefs = [];
  return `\n\n<div class="k-def-footer">${items}</div>`;
}

/**
 * Inline markdown → HTML. Supports **bold**, *italic*, [text](url), and
 * {{def:content}} which collects definitions for the slide-level footnote band
 * and emits a superscript reference inline.
 */
export function md(text: string): string {
  const escaped = escape(text).replace(DEF_RE, (_, content) => {
    _slideDefs.push(content);
    return `\x00DEF${_slideDefs.length}\x00`;
  });
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\x00DEF(\d+)\x00/g, (_m, n) => `<sup class="k-def-ref">${n}</sup>`);
}

export const STAGGER_DELAY_MS = 100;
export function vMotion(_index: number): string {
  return '';
}

export type Surface = 'dark' | 'light' | 'gradient';

export function surfaceClass(surface?: Surface | null): string {
  return surface === 'light' ? 'relative' : 'relative k-dark';
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
  const imageLine = image?.url ? `\nimage: ${image.url}` : '';
  return `---
layout: ${effectiveLayout}
class: ${cls}${imageLine}${chromeFlag}
---

${body}${consumeDefFooter()}`;
}
