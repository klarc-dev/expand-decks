import { K } from '../classNames';
import { escape, gridClass, md, wrapSlide } from '../utils';

export type QuotesBlockData = {
  blockType: 'quotes';
  eyebrow?: string | null;
  title: string;
  quotes?: Array<{
    quote: string;
    authorName: string;
    authorRole?: string | null;
  }> | null;
};

export function renderQuotes(block: QuotesBlockData): string {
  const quotes = block.quotes ?? [];
  const grid = gridClass(quotes.length || 3);

  const eyebrow = block.eyebrow
    ? `\n    <div class="${K.eyebrow} mb-4">${escape(block.eyebrow)}</div>`
    : '';

  const quotesHtml = quotes
    .map((q) => {
      const role = q.authorRole
        ? `<br/>\n    <span>${escape(q.authorRole)}</span>`
        : '';
      return `<div class="${K.card}">\n  <p class="${K.quote} text-base leading-snug mb-6">\n    ${escape(q.quote)}\n  </p>\n  <div class="${K.author}">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
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
