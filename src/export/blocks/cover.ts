import { escape, md } from '../utils';

export type CoverBlockData = {
  blockType: 'cover';
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  footerLeft?: string | null;
  footerRight?: string | null;
  surface?: 'dark' | 'light' | 'gradient' | null;
};

export function renderCover(block: CoverBlockData): string {
  const isDark = block.surface !== 'light';
  const darkClass = isDark ? ' k-dark' : '';

  const eyebrow = block.eyebrow
    ? `\n      <div class="k-eyebrow mb-8 k-anim-1">${escape(block.eyebrow)}</div>`
    : '';

  const subtitle = block.subtitle
    ? `\n      <p class="k-hero-sub k-anim-3">${md(block.subtitle)}</p>`
    : '';

  const footerLeft = block.footerLeft
    ? `\n    <div class="flex gap-4 k-anim-4">\n      <div class="k-btn">${escape(block.footerLeft)}</div>\n    </div>`
    : '';

  const footerRight = block.footerRight
    ? `\n    <div class="text-right text-xs opacity-60 tracking-wider uppercase k-anim-4">\n      ${escape(block.footerRight)}\n    </div>`
    : '';

  const footerRow = footerLeft || footerRight
    ? `\n  <div class="flex items-end justify-between">${footerLeft}${footerRight}\n  </div>`
    : '';

  return `---
layout: cover
---

<div class="${darkClass.trim()} absolute inset-0 flex flex-col justify-between p-14 k-cover">
  <div class="flex-1 flex items-center">
    <div class="max-w-4xl">${eyebrow}
      <h1 class="k-hero-big mb-10 k-anim-2">${md(block.title)}</h1>${subtitle}
    </div>
  </div>${footerRow}
</div>`;
}
