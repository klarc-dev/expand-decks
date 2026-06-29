import type { StatsBlockData } from '../../blocks/spec/stats';
import { K } from '../classNames';
import {
  contentFrame,
  escape,
  gridClass,
  slideHeader,
  surfaceClass,
  wrapSlide,
  type RenderCtx,
} from '../utils';

export type { StatsBlockData };

export function renderStats(block: StatsBlockData, ctx?: RenderCtx): string {
  const stats = block.stats ?? [];
  const statGrid = gridClass(stats.length || 4);

  const items = stats
    .map((stat) => {
      return `<div class="k-stat-card">\n  <div class="${K.stat}">\n    <span class="val">${escape(stat.value)}</span>\n    <span class="lbl">${escape(stat.label)}</span>\n  </div>\n</div>`;
    })
    .join('\n\n');

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, align: 'center' });
  const body = contentFrame(`<div class="k-stat-grid ${statGrid}">\n\n${items}\n\n</div>`, {
    header,
  });

  return wrapSlide({
    classAttr: surfaceClass(block.surface ?? ctx?.surface),
    body,
  });
}
