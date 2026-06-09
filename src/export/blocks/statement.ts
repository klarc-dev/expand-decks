import type { StatementBlockData } from '../../blocks/spec/statement';
import { K } from '../classNames';
import { eyebrow as renderEyebrow, md, wrapSlide } from '../utils';
import { richTextToHTML } from '../richtext';

export type { StatementBlockData };

export function renderStatement(block: StatementBlockData): string {
  const eyebrow = renderEyebrow(block.eyebrow);

  // body is rich text; richTextToHTML emits block-level HTML (its own <p>), so
  // wrap in a styling container, not another <p>.
  const bodyHtml = richTextToHTML(block.body);
  const bodyText = bodyHtml
    ? `\n\n<div class="text-xl leading-relaxed max-w-3xl">\n${bodyHtml}\n</div>`
    : '';

  // Footer renders as an in-flow caption INSIDE the content column — not as an
  // absolute .k-foot bar, which collided with the deck-level .k-slide-footer
  // (chrome.ts). The deck footer is the single absolute footer; per-block footer
  // text is a caption above it.
  const footerHtml = richTextToHTML(block.footer);
  const footer = footerHtml
    ? `\n\n<div class="${K.caption} mt-10">\n  ${footerHtml}\n</div>`
    : '';

  const body = `<div class="max-w-4xl px-12">
${eyebrow}
<h1 class="mb-8">
${md(block.title)}
</h1>${bodyText}${footer}

</div>`;

  return wrapSlide({ layout: 'center', body });
}
