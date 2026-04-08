import { escape, md } from '../utils';

export type TestimonialsBlockData = {
  blockType: 'testimonials';
  eyebrow?: string | null;
  title: string;
  rating?: string | null;
  quotes?: Array<{
    quote: string;
    authorName: string;
    authorRole?: string | null;
  }> | null;
};

export function renderTestimonials(block: TestimonialsBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n    <div class="k-eyebrow mb-4">${escape(block.eyebrow)}</div>`
    : '';

  const rating = block.rating
    ? `\n  <div class="text-right">\n    <div class="text-3xl" style="color: var(--k-rose); font-family: \'Fraunces\', serif;">${escape(block.rating)}</div>\n  </div>`
    : '';

  const quoteCount = (block.quotes ?? []).length || 3;
  const gridClass = `k-grid-${Math.min(quoteCount, 4)}`;

  const quotes = (block.quotes ?? [])
    .map((q) => {
      const role = q.authorRole
        ? `<br/>\n    <span>${escape(q.authorRole)}</span>`
        : '';
      return `<div class="k-card">\n  <p class="k-quote text-base leading-snug mb-6">\n    ${escape(q.quote)}\n  </p>\n  <div class="k-author">\n    ${escape(q.authorName)}${role}\n  </div>\n</div>`;
    })
    .join('\n\n');

  return `---
layout: default
class: relative
---

<div class="px-14 pt-24">

<div class="flex items-end justify-between mb-12">
  <div>${eyebrow}
    <h2 class="text-5xl">${md(block.title)}</h2>
  </div>${rating}
</div>

<div class="${gridClass}">

${quotes}

</div>

</div>`;
}
