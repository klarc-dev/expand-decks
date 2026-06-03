import { escape, md, wrapSlide } from '../utils';

export type CtaBlockData = {
  blockType: 'cta';
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  primaryAction?: string | null;
  secondaryAction?: string | null;
  footerNote?: string | null;
};

export function renderCta(block: CtaBlockData): string {
  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow k-eyebrow-dark mb-10">\n  ${escape(block.eyebrow)}\n</div>`
    : '';

  const subtitle = block.subtitle
    ? `\n\n<p class="k-cta-sub mb-12">\n  ${md(block.subtitle)}\n</p>`
    : '';

  const buttons: string[] = [];
  if (block.primaryAction) {
    buttons.push(`<div class="k-btn">${escape(block.primaryAction)}</div>`);
  }
  if (block.secondaryAction) {
    buttons.push(`<div class="k-btn-ghost">${escape(block.secondaryAction)}</div>`);
  }
  const buttonsHtml = buttons.length > 0
    ? `\n\n<div class="flex gap-4 justify-center mb-16">\n  ${buttons.join('\n  ')}\n</div>`
    : '';

  const footerNote = block.footerNote
    ? `\n\n<div class="text-xs tracking-[0.3em] uppercase opacity-40 mt-16">\n  ${escape(block.footerNote)}\n</div>`
    : '';

  const body = `<div class="text-center max-w-5xl px-12 w-full">
${eyebrow}
<h1 class="k-cta-title mb-4">
${md(block.title)}
</h1>${subtitle}${buttonsHtml}${footerNote}

</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: 'relative k-dark',
    hideChrome: true,
    body,
  });
}
