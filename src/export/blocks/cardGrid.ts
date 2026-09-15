import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { K } from '../classNames';
import { cardLayoutDensity, visibleText } from '../density';
import { renderPeopleStrip } from '../people';
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

  const peopleProminent = cardList.length === 0;
  const people = renderPeopleStrip(
    block.intervenants,
    peopleProminent ? `${K.cardGridPeople} ${K.cardGridPeopleGrid}` : K.cardGridPeople,
  );
  const requestedCols = Number(block.columns ?? '4');
  const topology = cardStack(
    renderedCards.map((item) => item.html),
    { layout: 'grid', maxCols: requestedCols },
  );
  const density = cardLayoutDensity({
    profile: 'card-grid',
    itemPressures: renderedCards.map((item) => item.pressure),
    cols: topology.cols || 1,
    occupancy: { lead: leadHtml, people },
  });
  const stack = cardStack(
    renderedCards.map((item) => item.html),
    { layout: 'grid', maxCols: requestedCols, density },
  );

  const parts = [stack.html, people].filter(Boolean);
  const bodyCls =
    stack.html && people ? 'k-cardgrid-body k-cardgrid-body--with-people' : 'k-cardgrid-body';
  const main = parts.length ? `<div class="${bodyCls}">\n${parts.join('\n')}\n</div>` : '';
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density,
  });
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    density,
    mainAlign: peopleProminent && people ? 'center' : 'stretch',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
