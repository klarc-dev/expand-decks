import type { QuotesBlockData } from '../../blocks/spec/quotes';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { escape, eyebrow as renderEyebrow, gridClass, md, wrapSlide } from '../utils';

export type { QuotesBlockData };

export function renderQuotes(block: QuotesBlockData): string {
  const quotes = block.quotes ?? [];
  const grid = gridClass(quotes.length || 3);

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-4', { indent: '    ' });

  const quotesHtml = quotes
    .map((q) => {
      const role = q.authorRole
        ? `<br/>\n    <span>${escape(q.authorRole)}</span>`
        : '';
      const quoteHtml = richTextToHTML(q.quote);
      return `<div class="${K.card}">\n  <div class="${K.quote} text-base leading-snug mb-6">\n    ${quoteHtml}\n  </div>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
    })
    .join('\n\n');

  const body = `<div class="px-14 pt-24">

<div class="mb-12">${eyebrow}
  <h2 class="text-5xl">${md(block.title)}</h2>
</div>

<div class="${grid}">

${quotesHtml}

</div>

</div>`;

  return wrapSlide({ body });
}
