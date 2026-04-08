import { escape, md, vMotion } from '../utils';

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
  const cols = block.columns ?? '4';
  const gridClass = `k-grid-${cols}`;

  const eyebrow = block.eyebrow
    ? `\n    <div class="k-eyebrow mb-4">${escape(block.eyebrow)}</div>`
    : '';

  const sidebar = block.sidebarText
    ? `\n  <p class="text-sm text-right max-w-xs opacity-70">\n    ${md(block.sidebarText)}\n  </p>`
    : '';

  const cards = (block.cards ?? [])
    .map((card, i) => {
      const num = card.number
        ? `\n  <span class="k-num">${escape(card.number)}</span>`
        : '';
      const desc = card.description
        ? `\n  <p>${md(card.description)}</p>`
        : '';
      return `<div class="k-card" ${vMotion(i)}>${num}\n  <h3>${escape(card.title)}</h3>${desc}\n</div>`;
    })
    .join('\n\n');

  return `---
layout: default
class: relative
---

<div class="px-14 pt-24">

<div class="flex items-end justify-between mb-10">
  <div>${eyebrow}
    <h2 class="text-5xl">${md(block.title)}</h2>
  </div>${sidebar}
</div>

<div class="${gridClass}">

${cards}

</div>

</div>`;
}
