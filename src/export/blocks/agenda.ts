import type { AgendaBlockData } from '../../blocks/spec/agenda';
import { K } from '../classNames';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { AgendaBlockData };

export function renderAgenda(block: AgendaBlockData, ctx?: RenderCtx): string {
  // Authored items win; an empty agenda auto-derives its list from the deck's
  // `section` titles (passed in via ctx.sections) — drop the block in and it
  // stays in sync with the structure, no manual fill.
  const items =
    block.items && block.items.length > 0
      ? block.items
      : (ctx?.sections ?? []).map((label) => ({ label, description: null }));
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

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(`${header}\n\n<ol class="${K.agenda}">\n${rows}\n</ol>`, {
    wFull: true,
  });

  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
