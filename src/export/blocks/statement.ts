import { escape, md } from '../utils';

export type StatementBlockData = {
  blockType: 'statement';
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  footer?: string | null;
};

export function renderStatement(block: StatementBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow mb-8">${escape(block.eyebrow)}</div>`
    : '';

  const body = block.body
    ? `\n\n<p class="text-xl leading-relaxed max-w-3xl">\n${md(block.body)}\n</p>`
    : '';

  const footer = block.footer
    ? `\n\n<div class="k-foot">\n  <span>${escape(block.footer)}</span>\n</div>`
    : '';

  return `---
layout: center
class: relative
---

<div class="max-w-4xl px-12">
${eyebrow}
<h1
  v-motion
  :initial="{ y: 20, opacity: 0 }"
  :enter="{ y: 0, opacity: 1, transition: { delay: 150 } }"
  class="mb-8"
>
${md(block.title)}
</h1>${body}

</div>${footer}`;
}
