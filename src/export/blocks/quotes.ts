import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { cardStack, contentFrame, escape, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { QuotesBlockData };

function textLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length;
}

export function renderQuotes(block: QuotesBlockData, ctx?: RenderCtx): string {
  const quotes = block.quotes ?? [];
  const renderedQuotes = quotes.map((q) => ({ ...q, quoteHtml: richTextToHTML(q.quote) }));
  const totalQuoteLength = renderedQuotes.reduce((sum, q) => sum + textLength(q.quoteHtml), 0);
  const dense = quotes.length >= 4 || totalQuoteLength > 520;

  // Quote cards are quote-specific (quote body + attribution), so they're not
  // the generic card() primitive — but they flow through the shared cardStack.
  const quoteCards = renderedQuotes.map((q) => {
    const role = q.authorRole ? `<br/>\n    <span>${escape(q.authorRole)}</span>` : '';
    return `<div class="${K.card} k-quote-card">\n  <div class="${K.quote} text-base leading-snug">\n    ${q.quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
  });

  const cols = dense ? Math.min(quotes.length, 2) || 1 : quotes.length || 1;
  const stack = cardStack(quoteCards, { layout: 'grid', cols });
  // When dense, force the k-tight quote typography even in the 2x2 case (where
  // the grid is only 2 rows and cardStack's rows>2 crowding heuristic wouldn't
  // trip), so four long quotes shrink rather than overflow.
  const stackHtml =
    dense && !stack.html.includes('k-tight')
      ? stack.html.replace('k-card-stack--grid', 'k-card-stack--grid k-tight')
      : stack.html;
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title });
  const body = contentFrame(stackHtml, { header, crowded: dense || stack.crowded });

  return wrapSlide({ surface: ctx?.surface, body });
}
