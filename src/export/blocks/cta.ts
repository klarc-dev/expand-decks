import { escape, md } from '../utils';

export type CtaBlockData = {
  blockType: 'cta';
  eyebrow?: string | null;
  title: string;
  primaryAction?: string | null;
  secondaryAction?: string | null;
  contactRows?: Array<{
    label: string;
    value: string;
  }> | null;
};

export function renderCta(block: CtaBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow mb-10" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #fff;">\n  ${escape(block.eyebrow)}\n</div>`
    : '';

  const buttons: string[] = [];
  if (block.primaryAction) {
    buttons.push(`<div class="k-btn">${escape(block.primaryAction)}</div>`);
  }
  if (block.secondaryAction) {
    buttons.push(`<div class="k-btn-ghost">${escape(block.secondaryAction)}</div>`);
  }
  const buttonsHtml = buttons.length > 0
    ? `\n\n<div class="flex gap-4 mb-16">\n  ${buttons.join('\n  ')}\n</div>`
    : '';

  const rows = (block.contactRows ?? [])
    .map((row) => {
      return `<div>\n    <div class="text-xs tracking-wider uppercase opacity-60 mb-2">${escape(row.label)}</div>\n    <div class="text-lg" style="color: #fff;">${escape(row.value)}</div>\n  </div>`;
    })
    .join('\n  ');

  const contactGrid = rows
    ? `\n\n<div class="grid grid-cols-${(block.contactRows ?? []).length} gap-8 pt-8" style="border-top: 1px solid rgba(255,255,255,0.15);">\n  ${rows}\n</div>`
    : '';

  return `---
layout: center
class: relative k-dark
---

<div class="max-w-5xl px-12 w-full">
${eyebrow}
<h1 class="mb-12" style="color: #fff; font-size: 5.5rem; line-height: 0.95;">
${md(block.title)}
</h1>${buttonsHtml}${contactGrid}

</div>`;
}
