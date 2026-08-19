import type { CardGridBlockData } from '../../blocks/spec/cardGrid';
import { richTextToHTML } from '../richtext';
import { card, cardStack, contentFrame, slideHeader, wrapSlide, type RenderCtx } from '../utils';

export type { CardGridBlockData };

function balancedGridColumns(requested: number, count: number): number {
  // Five or six cards read better as a balanced 3-col grid (2 rows) than as a
  // 4-col grid with an orphan row. Authors can still request 2 or 3 explicitly.
  if (requested >= 4 && count >= 5 && count <= 6) return 3;
  return requested;
}

function textLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length;
}

function sharedCardScale(
  cards: NonNullable<CardGridBlockData['cards']>,
  cols: number,
): 'md' | 'sm' | 'xs' {
  const maxLength = Math.max(
    0,
    ...cards.map((card) => card.title.length + textLength(richTextToHTML(card.description))),
  );
  const rows = Math.ceil(cards.length / cols);
  const normalLimit = cols >= 4 ? 82 : cols === 3 ? 112 : 160;
  const compactLimit = cols >= 4 ? 122 : cols === 3 ? 158 : 220;
  const rowPenalty = Math.max(0, rows - 2) * 24;

  if (maxLength + rowPenalty > compactLimit) return 'xs';
  if (maxLength + rowPenalty > normalLimit) return 'sm';
  return 'md';
}

export function renderCardGrid(block: CardGridBlockData, ctx?: RenderCtx): string {
  const leadHtml = richTextToHTML(block.sidebarText);

  const cardList = block.cards ?? [];
  const cards = cardList.map((c) =>
    card({ number: c.number, title: c.title, body: richTextToHTML(c.description) }),
  );

  const requestedCols = Number(block.columns ?? '4');
  const cols = balancedGridColumns(requestedCols, cardList.length);
  const scale = sharedCardScale(cardList, cols);
  const stack = cardStack(cards, {
    layout: 'grid',
    cols,
    className: `k-card-scale-${scale}`,
  });
  const lead = leadHtml ? `<div class="k-cardgrid-lead">\n${leadHtml}\n</div>` : '';
  const main =
    lead || stack.html
      ? `<div class="k-cardgrid-body">\n${lead}${lead && stack.html ? '\n' : ''}${stack.html}\n</div>`
      : '';
  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title });
  const body = contentFrame(main, { header, crowded: stack.crowded, mainAlign: 'stretch' });

  return wrapSlide({ surface: ctx?.surface, body });
}
