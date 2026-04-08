import { escape } from '../utils';

export type EndBlockData = {
  blockType: 'end';
  wordmark?: string | null;
  tagline?: string | null;
  footerNote?: string | null;
};

export function renderEnd(block: EndBlockData): string {
  const wordmark = block.wordmark
    ? `\n<div\n  v-motion\n  :initial="{ scale: 0.9, opacity: 0 }"\n  :enter="{ scale: 1, opacity: 1, transition: { duration: 800 } }"\n  class="k-logo mb-8"\n  style="font-size: 4rem;"\n>\n  ${escape(block.wordmark)}\n</div>`
    : '';

  const tagline = block.tagline
    ? `\n\n<p class="text-xl opacity-75 mb-2" style="font-family: 'Fraunces', serif; font-style: italic;">\n  ${escape(block.tagline)}\n</p>`
    : '';

  const footerNote = block.footerNote
    ? `\n\n<div class="text-xs tracking-[0.3em] uppercase opacity-40 mt-16">\n  ${escape(block.footerNote)}\n</div>`
    : '';

  return `---
layout: center
class: relative k-dark
---

<div class="text-center">
${wordmark}${tagline}${footerNote}
</div>`;
}
