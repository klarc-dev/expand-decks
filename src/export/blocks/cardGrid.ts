import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { escape, eyebrow as renderEyebrow, gridClass, md, wrapSlide } from '../utils';

export type { CardGridBlockData };

export function renderCardGrid(block: CardGridBlockData): string {
  const eyebrow = renderEyebrow(block.eyebrow, 'mb-4', { indent: '    ' });

  const sidebarHtml = richTextToHTML(block.sidebarText);
  const sidebar = sidebarHtml
    ? `\n  <div class="text-sm text-right max-w-xs opacity-70">\n    ${sidebarHtml}\n  </div>`
    : '';

  const cardList = block.cards ?? [];
  const cards = cardList
    .map((card) => {
      const num = card.number ? `\n  <span class="${K.num}">${escape(card.number)}</span>` : '';
      const descHtml = richTextToHTML(card.description);
      const desc = descHtml ? `\n  <div>${descHtml}</div>` : '';
      return `<div class="${K.card}">${num}\n  <h3>${escape(card.title)}</h3>${desc}\n</div>`;
    })
    .join('\n\n');

  // The canvas is a fixed 720px tall. Up to 2 rows of cards fit under the
  // standard pt-24 header; a 3rd row (5+ cards in 2 cols, or 7+ in 3 cols)
  // overflows and gets clipped by the slide edge. Shrink the vertical chrome
  // when the grid is crowded so any card count stays on-canvas.
  const cols = Math.min(Math.max(Number(block.columns ?? '4'), 2), 4);
  const rows = Math.ceil(cardList.length / cols);
  const crowded = rows > 2;
  const topPad = crowded ? 'pt-16' : 'pt-24';
  const headerMargin = crowded ? 'mb-6' : 'mb-10';

  const body = `<div class="px-14 ${topPad}">

<div class="flex items-end justify-between ${headerMargin}">
  <div>${eyebrow}
    <h2 class="text-5xl">${md(block.title)}</h2>
  </div>${sidebar}
</div>

<div class="${gridClass(cols)}">

${cards}

</div>

</div>`;

  return wrapSlide({ body });
}
