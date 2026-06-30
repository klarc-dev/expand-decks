import type { TwoColsBlockData } from '../../blocks/spec/twoCols';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import {
  card,
  cardStack,
  contentFrame,
  slideHeader,
  wrapSlide,
  type RenderCtx,
  type SlideImage,
} from '../utils';

export type { TwoColsBlockData };

export function renderTwoCols(block: TwoColsBlockData, ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });

  // <div> not <p>: richTextToHTML emits its own block-level <p>.
  const introHtml = richTextToHTML(block.intro);
  const intro = introHtml
    ? `\n<hr class="${K.divider}"/>\n\n<div class="k-copy-stack k-copy-stack--lead">\n${introHtml}\n</div>`
    : '';

  const leftFooterHtml = richTextToHTML(block.leftFooter);
  const leftFooter = leftFooterHtml
    ? `\n<div class="k-copy-stack k-copy-stack--note k-side-note">${leftFooterHtml}</div>`
    : '';

  const leftBody =
    intro || leftFooter ? `<div class="k-copy-column">${intro}${leftFooter}\n</div>` : '';
  const cardList = block.rightCards ?? [];

  // Image variant: image takes the right slot via Slidev's image-right layout;
  // rightCards, when present, stay in the content column instead of being dropped.
  if (image) {
    const cards = cardList.map((c) =>
      card({ title: c.title, body: richTextToHTML(c.description) }),
    );
    const stack = cardStack(cards, { layout: 'column' });
    const body = [leftBody, stack.html].filter(Boolean).join('\n\n');
    return wrapSlide({ image, body: contentFrame(body, { header, crowded: stack.crowded }) });
  }

  // No titleClass override: card titles must render at the shared .k-card h3
  // size (var(--t-h3)) whether the card sits in a cardGrid or a twoCols column.
  // The old 'text-sm' made twoCols card titles smaller than cardGrid ones.
  const cards = cardList.map((c) => card({ title: c.title, body: richTextToHTML(c.description) }));
  const stack = cardStack(cards, { layout: 'column' });
  const rightCol = cards.length ? `\n<div class="k-split-cards">${stack.html}\n</div>` : '';
  const leftCol = leftBody || (rightCol ? '<div></div>' : '');
  const main = `<div class="${K.split} k-split--body">\n${leftCol}${rightCol}\n</div>`;
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    mainAlign: 'start',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
