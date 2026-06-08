import { K } from '../classNames';
import { escape, eyebrow as renderEyebrow, gridClass, md, wrapSlide } from '../utils';

export type CardGridBlockData = {
  blockType: 'cardGrid';
  eyebrow?: string | null;
  title: string;
  sidebarText?: string | null;
  columns?: '2' | '3' | '4' | null;
  cards?: Array<{
    number?: string | null;
    title: string;
    description?: string | null;
  }> | null;
};

export function renderCardGrid(block: CardGridBlockData): string {
  const eyebrow = renderEyebrow(block.eyebrow, 'mb-4', { indent: '    ' });

  const sidebar = block.sidebarText
    ? `\n  <p class="text-sm text-right max-w-xs opacity-70">\n    ${md(block.sidebarText)}\n  </p>`
    : '';

  const cards = (block.cards ?? [])
    .map((card) => {
      const num = card.number ? `\n  <span class="${K.num}">${escape(card.number)}</span>` : '';
      const desc = card.description ? `\n  <p>${md(card.description)}</p>` : '';
      return `<div class="${K.card}">${num}\n  <h3>${escape(card.title)}</h3>${desc}\n</div>`;
    })
    .join('\n\n');

  const body = `<div class="px-14 pt-24">

<div class="flex items-end justify-between mb-10">
  <div>${eyebrow}
    <h2 class="text-5xl">${md(block.title)}</h2>
  </div>${sidebar}
</div>

<div class="${gridClass(Number(block.columns ?? '4'))}">

${cards}

</div>

</div>`;

  return wrapSlide({ body });
}
