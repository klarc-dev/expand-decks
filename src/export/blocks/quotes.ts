import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { densityFromScore, visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import { cardStack, contentFrame, escape, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { QuotesBlockData };

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
  const density = densityFromScore(maxQuotePressure + quotes.length * 92, {
    compact: 300,
    dense: 470,
  });
  const dense = density === 'dense' || quotes.length >= 4;

  // Quote cards are quote-specific (quote body + attribution), so they're not
  // the generic card() primitive — but they flow through the shared cardStack.
  const quoteCards = renderedQuotes.map((q) => {
    const role = q.authorRole ? `<br/>\n    <span>${escape(q.authorRole)}</span>` : '';
    return `<div class="${K.card} ${K.quoteCard}">\n  <div class="${K.quote}">\n    ${q.quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
  });

  const cols = dense ? Math.min(quotes.length, 2) || 1 : quotes.length || 1;
  const stack = cardStack(quoteCards, {
    layout: 'grid',
    cols,
    density,
    forceTight: dense,
  });
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, density });
  const body = contentFrame(stack.html, {
    header,
    crowded: dense || stack.crowded,
    density,
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
