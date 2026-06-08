import { K } from '../classNames';
import { escape, eyebrow as renderEyebrow, md, surfaceClass, wrapSlide } from '../utils';

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
  const eyebrow = renderEyebrow(block.eyebrow, 'mb-10', {
    extraClass: K.eyebrowDark,
    multiline: true,
  });

  const subtitle = block.subtitle
    ? `\n\n<p class="${K.ctaSub} mb-12">\n  ${md(block.subtitle)}\n</p>`
    : '';

  const buttons: string[] = [];
  if (block.primaryAction) {
    buttons.push(`<div class="${K.btn}">${escape(block.primaryAction)}</div>`);
  }
  if (block.secondaryAction) {
    buttons.push(`<div class="${K.btnGhost}">${escape(block.secondaryAction)}</div>`);
  }
  const buttonsHtml = buttons.length > 0
    ? `\n\n<div class="flex gap-4 justify-center mb-16">\n  ${buttons.join('\n  ')}\n</div>`
    : '';

  const footerNote = block.footerNote
    ? `\n\n<div class="text-xs tracking-[0.3em] uppercase opacity-40 mt-16">\n  ${escape(block.footerNote)}\n</div>`
    : '';

  const body = `<div class="text-center max-w-5xl px-12 w-full">
${eyebrow}
<h1 class="${K.ctaTitle} mb-4">
${md(block.title)}
</h1>${subtitle}${buttonsHtml}${footerNote}

</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass('dark'),
    hideChrome: true,
    body,
  });
}
