import { escape, md } from '../utils';

export type SectionBlockData = {
  blockType: 'section';
  number?: string | null;
  title: string;
  subtitle?: string | null;
  surface?: 'dark' | 'light' | null;
};

export function renderSection(block: SectionBlockData): string {
  const isDark = block.surface !== 'light';
  const classAttr = isDark ? 'relative k-dark' : 'relative';

  const number = block.number
    ? `\n<div class="k-section-num mb-4">${escape(block.number)}</div>`
    : '';

  const subtitle = block.subtitle
    ? `\n\n<p class="text-xl opacity-75 max-w-3xl mx-auto leading-relaxed">\n${md(block.subtitle)}\n</p>`
    : '';

  return `---
layout: center
class: ${classAttr}
---

<div class="text-center max-w-5xl px-12">
${number}
<h1
  v-motion
  :initial="{ scale: 0.95, opacity: 0 }"
  :enter="{ scale: 1, opacity: 1, transition: { duration: 700 } }"
  class="text-6xl mb-8"
>
${md(block.title)}
</h1>${subtitle}

</div>`;
}
