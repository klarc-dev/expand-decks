import type { AgendaBlockData } from '../../blocks/spec/agenda';
import { K } from '../classNames';
import { densityClass, densityFromScore } from '../density';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { AgendaBlockData };

function needsDenseAgenda(items: NonNullable<AgendaBlockData['items']>): boolean {
  const descriptionLengths = items.map((item) => item.description?.length ?? 0);
  const totalDescriptionLength = descriptionLengths.reduce((sum, length) => sum + length, 0);
  return (
    items.length >= 6 ||
    totalDescriptionLength > 360 ||
    descriptionLengths.some((length) => length > 90)
  );
}

export function renderAgenda(block: AgendaBlockData, ctx?: RenderCtx): string {
  // Authored items win; an empty agenda auto-derives its list from the deck's
  // `section` titles (passed in via ctx.sections) — drop the block in and it
  // stays in sync with the structure, no manual fill.
  const items =
    block.items && block.items.length > 0
      ? block.items
      : (ctx?.sections ?? []).map((label) => ({ label, description: null }));
  const dense = needsDenseAgenda(items);
  const density = densityFromScore(
    items.reduce(
      (score, item) => score + item.label.length * 1.3 + (item.description?.length ?? 0),
      items.length * 52,
    ),
    { compact: 360, dense: 620 },
  );
  // `active` is 1-based; only emphasize when it points at a real item.
  const active = block.active ?? 0;
  const hasActive = active >= 1 && active <= items.length;

  const rows = items
    .map((item, i) => {
      const isActive = hasActive && i + 1 === active;
      // When a section is active, the others are dimmed so the eye lands on the
      // current one; with no active section every row renders at full strength.
      const state = hasActive ? (isActive ? ` ${K.agendaItemActive}` : ` ${K.agendaItemDim}`) : '';
      const num = String(i + 1).padStart(2, '0');
      const desc = item.description
        ? `\n    <p class="${K.agendaDesc}">${md(item.description)}</p>`
        : '';
      return `  <li class="${K.agendaItem}${state}">
    <span class="${K.agendaNum}">${num}</span>
    <h3 class="${K.agendaLabel}">${md(item.label)}</h3>${desc}
  </li>`;
    })
    .join('\n');

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md', density });
  const fit = dense || items.length >= 4;
  const agendaClass = [
    K.agenda,
    dense ? 'k-agenda--dense' : '',
    fit ? 'k-agenda--fit' : '',
    densityClass(density),
  ]
    .filter(Boolean)
    .join(' ');
  const bodyHtml = contentFrame(`<ol class="${agendaClass}">\n${rows}\n</ol>`, {
    header,
    wFull: true,
    crowded: dense,
    density,
    mainAlign: fit ? 'stretch' : 'center',
  });

  return wrapSlide({ classAttr: surfaceClass(ctx?.surface ?? 'light'), body: bodyHtml });
}
