import { K } from '../classNames';
import { escape, eyebrow as renderEyebrow, md, wrapSlide } from '../utils';

export type StatementBlockData = {
  blockType: 'statement';
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  footer?: string | null;
};

export function renderStatement(block: StatementBlockData): string {
  const eyebrow = renderEyebrow(block.eyebrow);

  const bodyText = block.body
    ? `\n\n<p class="text-xl leading-relaxed max-w-3xl">\n${md(block.body)}\n</p>`
    : '';

  const footer = block.footer
    ? `\n\n<div class="${K.foot}">\n  <span>${escape(block.footer)}</span>\n</div>`
    : '';

  const body = `<div class="max-w-4xl px-12">
${eyebrow}
<h1 class="mb-8">
${md(block.title)}
</h1>${bodyText}

</div>${footer}`;

  return wrapSlide({ layout: 'center', body });
}
