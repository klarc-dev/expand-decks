import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { K } from '../classNames';
import { cardScaleClass, densityFromScore, type SlideDensity, visibleText } from '../density';
import { renderPeopleStrip } from '../people';
import { richTextToHTML } from '../richtext';
import { card, cardStack, contentFrame, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { CardGridBlockData };

function balancedGridColumns(requested: number, count: number): number {
  if (count > 0 && count < requested) return count;
  // Five or six cards read better as a balanced 3-col grid (2 rows) than as a
  // 4-col grid with an orphan row. Authors can still request 2 or 3 explicitly.
  if (requested >= 4 && count >= 5 && count <= 6) return 3;
  return requested;
}

function sharedCardScale(
  cards: NonNullable<CardGridBlockData['cards']>,
  cols: number,
): { density: SlideDensity; scale: 'md' | 'sm' | 'xs' } {
  const maxLength = Math.max(
    0,
    ...cards.map(
      (card) => card.title.length + visibleText(richTextToHTML(card.description)).length,
    ),
  );
  const rows = Math.ceil(cards.length / cols);
  const normalLimit = cols >= 4 ? 82 : cols === 3 ? 112 : 160;
  const compactLimit = cols >= 4 ? 122 : cols === 3 ? 158 : 220;
  const rowPenalty = Math.max(0, rows - 2) * 24;

  const score = maxLength + rowPenalty;
  const density = densityFromScore(score, { compact: normalLimit, dense: compactLimit });
  return {
    density,
    scale: cardScaleClass(density).replace('k-card-scale-', '') as 'md' | 'sm' | 'xs',
  };
}

export function renderCardGrid(block: CardGridBlockData, ctx?: RenderCtx): string {
  const leadHtml = richTextToHTML(block.sidebarText);

  const cardList = block.cards ?? [];
  const cards = cardList.map((c) =>
    card({ number: c.number, title: c.title, body: richTextToHTML(c.description) }),
  );

  const requestedCols = Number(block.columns ?? '4');
  const cols = balancedGridColumns(requestedCols, cardList.length);
  const { density, scale } = sharedCardScale(cardList, cols);
  const stack = cardStack(cards, {
    layout: 'grid',
    cols,
    className: `k-card-scale-${scale}`,
    density,
  });
  const lead = leadHtml ? `<div class="k-cardgrid-lead">\n${leadHtml}\n</div>` : '';
  // Shared person-card strip. With cards present it reads as a discreet
  // contact band under the grid; without cards the people ARE the content, so
  // a modifier promotes the strip to a prominent grid that fills the slide.
  const peopleProminent = cardList.length === 0;
  const people = renderPeopleStrip(
    block.intervenants,
    peopleProminent ? `${K.cardGridPeople} ${K.cardGridPeopleGrid}` : K.cardGridPeople,
  );
  const parts = [lead, stack.html, people].filter(Boolean);
  // With cards AND a people strip, center the whole group so leftover height
  // splits above/below it instead of pooling between the cards and the strip.
  const bodyCls =
    stack.html && people ? 'k-cardgrid-body k-cardgrid-body--with-people' : 'k-cardgrid-body';
  const main = parts.length ? `<div class="${bodyCls}">\n${parts.join('\n')}\n</div>` : '';
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, density });
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    density,
    mainAlign: peopleProminent && people ? 'center' : 'stretch',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
