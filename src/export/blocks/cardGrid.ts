import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { richTextToHTML } from '../richtext';
import { card, cardStack, contentFrame, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { CardGridBlockData };

export function renderCardGrid(block: CardGridBlockData, ctx?: RenderCtx): string {
  const sidebarHtml = richTextToHTML(block.sidebarText);
  const sidebar = sidebarHtml
    ? `<div class="text-sm text-right max-w-xs k-side-note">\n    ${sidebarHtml}\n  </div>`
    : undefined;

  const cardList = block.cards ?? [];
  const cards = cardList.map((c) =>
    card({ number: c.number, title: c.title, body: richTextToHTML(c.description) }),
  );

  const cols = Number(block.columns ?? '4');
  const stack = cardStack(cards, { layout: 'grid', cols });
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, sidebar });
  const body = contentFrame(`${header}\n\n${stack.html}`, { crowded: stack.crowded });

  return wrapSlide({ surface: ctx?.surface, body });
}
