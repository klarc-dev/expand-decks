import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { densityClass, densityFromScore, visibleText } from '../density';
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
  const stack = cardStack(quoteCards, { layout: 'grid', cols });
  // When dense, force the k-tight quote typography even in the 2x2 case (where
  // the grid is only 2 rows and cardStack's rows>2 crowding heuristic wouldn't
  // trip), so four long quotes shrink rather than overflow.
  let stackHtml = stack.html;
  const sharedDensityClass = densityClass(density);
  if (sharedDensityClass) {
    stackHtml = stackHtml.replace('k-card-stack--grid', `k-card-stack--grid ${sharedDensityClass}`);
  }
  if (dense && !stackHtml.includes('k-tight')) {
    stackHtml = stackHtml.replace('k-card-stack--grid', 'k-card-stack--grid k-tight');
  }
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, density });
  const body = contentFrame(stackHtml, {
    header,
    crowded: dense || stack.crowded,
    density,
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
