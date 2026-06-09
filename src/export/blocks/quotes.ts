import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { cardStack, contentFrame, escape, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { QuotesBlockData };

export function renderQuotes(block: QuotesBlockData, ctx?: RenderCtx): string {
  const quotes = block.quotes ?? [];

  // Quote cards are quote-specific (quote body + attribution), so they're not
  // the generic card() primitive — but they flow through the shared cardStack.
  const quoteCards = quotes.map((q) => {
    const role = q.authorRole ? `<br/>\n    <span>${escape(q.authorRole)}</span>` : '';
    const quoteHtml = richTextToHTML(q.quote);
    return `<div class="${K.card}">\n  <div class="${K.quote} text-base leading-snug mb-6">\n    ${quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
  });

  const stack = cardStack(quoteCards, { layout: 'grid', cols: quotes.length || 3 });
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title });
  const body = contentFrame(`${header}\n\n${stack.html}`, { crowded: stack.crowded });

  return wrapSlide({ surface: ctx?.surface, body });
}
