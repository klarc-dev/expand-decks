import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import { card, cardStack, contentFrame, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { CardGridBlockData };

export function renderCardGrid(block: CardGridBlockData, ctx?: RenderCtx): string {
  const leadHtml = richTextToHTML(block.sidebarText);
  const cardList = block.cards ?? [];
  const renderedCards = cardList.map((item) => {
    const body = richTextToHTML(item.description);
    return {
      html: card({ number: item.number, title: item.title, body }),
      pressure: item.title.length + visibleText(body).length,
    };
  });

  const stack = cardStack(
    renderedCards.map((item) => item.html),
    {
      layout: 'grid',
      maxCols: Number(block.columns ?? '4'),
      profile: 'card-grid',
      itemPressures: renderedCards.map((item) => item.pressure),
      occupancy: { header: `${block.eyebrow ?? ''} ${block.title} ${leadHtml}` },
    },
  );

  const main = stack.html ? `<div class="k-cardgrid-body">\n${stack.html}\n</div>` : '';
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density: stack.density,
  });
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    density: stack.density,
    mainAlign: 'stretch',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
