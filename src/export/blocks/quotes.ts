import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import {
  cardStack,
  contentFrame,
  escape,
  safeHref,
  slideHeader,
  wrapSlide,
  type RenderCtx,
} from '../utils';

export type { QuotesBlockData };

// Lucide "quote" icon (ISC), inlined as filled paths so the mark is a solid
// glyph on its disc rather than a stroked outline. Inline SVG survives the
// PDF export; an icon font or external sprite would not be guaranteed to.
const QUOTE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">' +
  '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>' +
  '<path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>' +
  '</svg>';

export function renderQuotes(block: QuotesBlockData, ctx?: RenderCtx): string {
  const quotes = block.quotes ?? [];
  const renderedQuotes = quotes.map((q) => ({ ...q, quoteHtml: richTextToHTML(q.quote) }));
  const leadHtml = richTextToHTML(block.lead);

  // Quote cards are quote-specific (quote body + attribution), so they're not
  // the generic card() primitive — but they flow through the shared cardStack.
  const quoteCards = renderedQuotes.map((q) => {
    const role = q.authorRole ? `<br/>\n    <span>${escape(q.authorRole)}</span>` : '';
    const company = q.authorCompany?.trim()
      ? `\n    <span class="${K.authorCompany}">${escape(q.authorCompany.trim())}</span>`
      : '';
    return `<div class="${K.card} ${K.quoteCard}">\n  <span class="${K.quoteMark}">${QUOTE_ICON}</span>\n  <div class="${K.quote}">\n    ${q.quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}${company}\n  </div>\n</div>`;
  });

  const linkHref = safeHref(block.linkUrl);
  const link =
    block.linkLabel && linkHref
      ? `<div class="${K.quoteFooter}"><a class="${K.btnGhost}" href="${escape(linkHref)}">${escape(block.linkLabel)}</a></div>`
      : '';
  const stack = cardStack(quoteCards, {
    layout: 'grid',
    maxCols: quotes.length >= 4 ? 2 : quotes.length || 1,
    profile: 'quotes',
    itemPressures: renderedQuotes.map(
      (quote) =>
        visibleText(quote.quoteHtml).length +
        quote.authorName.length +
        (quote.authorRole?.length ?? 0) +
        (quote.authorCompany?.length ?? 0),
    ),
    occupancy: {
      header: `${block.eyebrow ?? ''} ${block.title} ${leadHtml}`,
      action: block.linkLabel ?? '',
    },
    dense: quotes.length >= 4,
  });
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density: stack.density,
  });
  const main = `<div class="k-quotes-body">${stack.html}${link}</div>`;
  // Quotes read top-down under the unified header; when an action is present,
  // the body uses the full row so the button anchors in the remaining lower
  // space instead of crowding the cards.
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    density: stack.density,
    mainAlign: 'stretch',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
