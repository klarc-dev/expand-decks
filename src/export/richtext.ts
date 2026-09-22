import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

import { applyDefs, safeHref } from './utils';

export type RichText = SerializedEditorState | null | undefined;

// Isomorphic: convertLexicalToHTML's runtime deps are escape-html + uuid +
// payload/shared (Payload's browser-safe bundle), so this bundles into the
// 'use client' preview AND runs in the server build job. Text nodes are already
// escaped by the converter — never escape() its output. applyDefs preserves the
// {{def:...}} footnote feature that authors type into rich-text fields.
export function richTextToHTML(data: RichText): string {
  if (!data) return '';
  const html = applyDefs(sanitizeAnchors(convertLexicalToHTML({ data })));
  // An editor field that was focused and left blank stores one empty
  // paragraph; that must read as "not filled" (no takeaway cartouche, no
  // empty copy column), not as `<p></p>` content.
  return isBlankHtml(html) ? '' : html;
}

// Structural tags with no text content. Media or rule embeds (`<img`, `<hr`)
// keep the field non-blank.
const BLANK_HTML_RE = /^(?:\s|<\/?(?:p|br|div|span|strong|em|u|b|i)(?:\s[^>]*)?\/?>|&nbsp;)*$/i;

function isBlankHtml(html: string): boolean {
  return BLANK_HTML_RE.test(html);
}

// The converter neutralises a `javascript:` URL into `href="#"` but keeps the
// anchor; an unknown scheme passes through untouched. Apply the same policy as
// md() links: a target safeHref rejects loses its anchor and keeps its text, and
// the editor's `target="_blank"`/`rel` attributes are dropped (meaningless in a
// PDF, and the SPA opens links in place like every other slide link).
const ANCHOR_RE = /<a\s[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;

function sanitizeAnchors(html: string): string {
  return html.replace(ANCHOR_RE, (_m, href: string, inner: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${safe}">${inner}</a>` : inner;
  });
}
