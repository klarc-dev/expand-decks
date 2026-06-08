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

  const footerHtml = richTextToHTML(block.footer);
  const footer = footerHtml
    ? `\n\n<div class="${K.foot}">\n  ${footerHtml}\n</div>`
    : '';

  const body = `<div class="max-w-4xl px-12">
${eyebrow}
<h1 class="mb-8">
${md(block.title)}
</h1>${bodyText}

</div>${footer}`;

  return wrapSlide({ layout: 'center', body });
}
