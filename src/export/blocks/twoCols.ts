import { escape, md } from '../utils';

export type TwoColsBlockData = {
  blockType: 'twoCols';
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  leftFooter?: string | null;
  rightCards?: Array<{
    title: string;
    description?: string | null;
  }> | null;
};

export function renderTwoCols(block: TwoColsBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow mb-6">${escape(block.eyebrow)}</div>`
    : '';

  const intro = block.intro
    ? `\n\n<hr class="k-divider"/>\n\n<p class="text-base leading-relaxed mb-8 max-w-md">\n${md(block.intro)}\n</p>`
    : '';

  const leftFooter = block.leftFooter
    ? `\n\n<div class="mt-12 max-w-md">\n  <p class="text-sm opacity-70">${md(block.leftFooter)}</p>\n</div>`
    : '';

  const cards = (block.rightCards ?? [])
    .map((card) => {
      const desc = card.description
        ? `\n  <p>${md(card.description)}</p>`
        : '';
      return `<div class="k-card">\n  <h3 class="text-sm">${escape(card.title)}</h3>${desc}\n</div>`;
    })
    .join('\n\n');

  const rightCol = cards
    ? `\n<div class="space-y-3">\n\n${cards}\n\n</div>`
    : '';

  return `---
layout: default
class: relative
---

<div class="k-split px-14 pt-28">

<div>
${eyebrow}
<h2 class="text-5xl mb-6">${md(block.title)}</h2>${intro}${leftFooter}

</div>
${rightCol}
</div>`;
}
