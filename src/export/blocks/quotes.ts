import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { densityFromScore, visibleText } from '../density';
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
  const maxQuotePressure = Math.max(
    0,
    ...renderedQuotes.map(
      (quote) =>
        visibleText(quote.quoteHtml).length +
        quote.authorName.length +
        (quote.authorRole?.length ?? 0),
    ),
  );
  const leadHtml = richTextToHTML(block.lead);
  const density = densityFromScore(
    maxQuotePressure + visibleText(leadHtml).length * 0.6 + quotes.length * 92,
    {
      compact: 300,
      dense: 470,
    },
  );
  const dense = density === 'dense' || quotes.length >= 4;

  // Quote cards are quote-specific (quote body + attribution), so they're not
  // the generic card() primitive — but they flow through the shared cardStack.
  const quoteCards = renderedQuotes.map((q) => {
    const role = q.authorRole ? `<br/>\n    <span>${escape(q.authorRole)}</span>` : '';
    return `<div class="${K.card} ${K.quoteCard}">\n  <span class="${K.quoteMark}">${QUOTE_ICON}</span>\n  <div class="${K.quote}">\n    ${q.quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
  });

  // Mirror cardGrid's balanced-grid rule: three quotes in a 2-col dense grid
  // strand an empty quadrant, so an odd 3 always lays out as one 3-col row.
  const cols = dense
    ? quotes.length === 3
      ? 3
      : Math.min(quotes.length, 2) || 1
    : quotes.length || 1;
  const stack = cardStack(quoteCards, {
    layout: 'grid',
    cols,
    density,
    forceTight: dense,
  });
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density,
  });
  const linkHref = safeHref(block.linkUrl);
  const link =
    block.linkLabel && linkHref
      ? `<div class="${K.quoteFooter}"><a class="${K.btnGhost}" href="${escape(linkHref)}">${escape(block.linkLabel)}</a></div>`
      : '';
  const main = `<div class="k-quotes-body">${stack.html}${link}</div>`;
  // Quotes read top-down under the unified header; when an action is present,
  // the body uses the full row so the button anchors in the remaining lower
  // space instead of crowding the cards.
  const body = contentFrame(main, {
    header,
    crowded: dense || stack.crowded,
    density,
    mainAlign: 'stretch',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
