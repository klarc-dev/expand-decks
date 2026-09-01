import type { StatsBlockData } from '../../blocks/spec/stats';
import { K } from '../classNames';
import { densityClass, densityFromScore } from '../density';
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

function balancedStatValue(value: string): string {
  return escape(value).replace(/([–—])/g, '<wbr>$1');
}

export function renderStats(block: StatsBlockData, ctx?: RenderCtx): string {
  const stats = block.stats ?? [];
  const statGrid = stats.length ? gridClass(stats.length) : '';
  const density = densityFromScore(
    Math.max(0, ...stats.map((stat) => stat.value.length * 2.4 + stat.label.length)) +
      stats.length * 42,
    { compact: 145, dense: 225 },
  );

  const items = stats
    .map((stat) => {
      return `<div class="${K.statCard}">\n  <div class="${K.stat}">\n    <span class="${K.statVal}">${balancedStatValue(stat.value)}</span>\n    <span class="${K.statLabel}">${escape(stat.label)}</span>\n  </div>\n</div>`;
    })
    .join('\n\n');

  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    align: 'center',
    density,
  });
  const main = stats.length
    ? `<div class="${[K.statGrid, statGrid, densityClass(density)].filter(Boolean).join(' ')}">\n\n${items}\n\n</div>`
    : '';
  const body = contentFrame(main, { header, density });

  return wrapSlide({
    classAttr: surfaceClass(ctx?.surface ?? 'light'),
    body,
  });
}
