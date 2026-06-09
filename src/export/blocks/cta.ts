import type { CtaBlockData } from '../../blocks/spec/cta';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import {
  escape,
  eyebrow as renderEyebrow,
  md,
  surfaceClass,
  wrapSlide,
  type RenderCtx,
} from '../utils';

export type { CtaBlockData };

export function renderCta(block: CtaBlockData, ctx?: RenderCtx): string {
  const eyebrow = renderEyebrow(block.eyebrow, 'mb-10', {
    extraClass: K.eyebrowDark,
    multiline: true,
  });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml
    ? `\n\n<div class="${K.ctaSub} mb-12">\n  ${subtitleHtml}\n</div>`
    : '';

  const buttons: string[] = [];
  if (block.primaryAction) {
    buttons.push(`<div class="${K.btn}">${escape(block.primaryAction)}</div>`);
  }
  if (block.secondaryAction) {
    buttons.push(`<div class="${K.btnGhost}">${escape(block.secondaryAction)}</div>`);
  }
  const buttonsHtml =
    buttons.length > 0
      ? `\n\n<div class="flex gap-4 justify-center mb-16">\n  ${buttons.join('\n  ')}\n</div>`
      : '';

  // mt-16 caption; uses the AA-safe k-caption token (+ uppercase modifier), not
  // opacity-40 or an inline style.
  const footerNoteHtml = richTextToHTML(block.footerNote);
  const footerNote = footerNoteHtml
    ? `\n\n<div class="${K.caption} k-caption--upper text-center mx-auto mt-16">\n  ${footerNoteHtml}\n</div>`
    : '';

  const body = `<div class="k-center-hero w-full">
${eyebrow}
<h1 class="${K.ctaTitle} mb-4">
${md(block.title)}
</h1>${subtitle}${buttonsHtml}${footerNote}

</div>`;

  // cta is the dark closing slide by default; a resolved tone can still override.
  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(ctx?.surface ?? 'dark'),
    hideChrome: true,
    body,
  });
}
