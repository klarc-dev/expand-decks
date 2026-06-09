import type { TwoColsBlockData } from '../../blocks/spec/twoCols';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { card, cardStack, contentFrame, slideHeader, wrapSlide, type RenderCtx, type SlideImage } from '../utils';

export type { TwoColsBlockData };

export function renderTwoCols(block: TwoColsBlockData, ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });

  // <div> not <p>: richTextToHTML emits its own block-level <p>.
  const introHtml = richTextToHTML(block.intro);
  const intro = introHtml
    ? `\n\n<hr class="${K.divider}"/>\n\n<div class="text-base leading-relaxed mb-8 max-w-md">\n${introHtml}\n</div>`
    : '';

  const leftFooterHtml = richTextToHTML(block.leftFooter);
  const leftFooter = leftFooterHtml
    ? `\n\n<div class="mt-12 max-w-md">\n  <div class="text-sm k-side-note">${leftFooterHtml}</div>\n</div>`
    : '';

  // Image variant: image takes the right slot via Slidev's image-right layout;
  // rightCards are intentionally dropped (single content column).
  if (image) {
    const body = contentFrame(`${header}${intro}${leftFooter}`);
    return wrapSlide({ image, body });
  }

  const cardList = block.rightCards ?? [];
  const cards = cardList.map((c) =>
    card({ title: c.title, body: richTextToHTML(c.description), titleClass: 'text-sm' }),
  );
  const stack = cardStack(cards, { layout: 'column' });
  const rightCol = cards.length ? `\n${stack.html}` : '';

  const left = `<div>\n${header}${intro}${leftFooter}\n</div>`;
  const body = contentFrame(`<div class="${K.split}">\n${left}${rightCol}\n</div>`, {
    crowded: stack.crowded,
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
