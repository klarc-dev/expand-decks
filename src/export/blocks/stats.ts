import type { StatsBlockData } from '../../blocks/spec/stats';
import { K } from '../classNames';
import {
  escape,
  eyebrow as renderEyebrow,
  md,
  surfaceClass,
  wrapSlide,
  type RenderCtx,
} from '../utils';

export type { StatsBlockData };

export function renderStats(block: StatsBlockData, ctx?: RenderCtx): string {
  const stats = block.stats ?? [];
  const statCount = stats.length || 4;

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-10');

  const items = stats
    .map((stat) => {
      return `<div>\n  <div class="${K.stat}">\n    <span class="val">${escape(stat.value)}</span>\n    <span class="lbl">${escape(stat.label)}</span>\n  </div>\n</div>`;
    })
    .join('\n\n');

  // Centered hero body (not slideHeader — the title IS the hero here, KTD6c).
  // .k-center-hero owns the rail + centered hero title via shared tokens.
  const body = `<div class="k-center-hero">
${eyebrow}
<h1 class="k-center-hero-title">
${md(block.title)}
</h1>

<div class="grid grid-cols-${statCount} gap-6 mt-16 max-w-4xl mx-auto">

${items}

</div>

</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(block.surface ?? ctx?.surface),
    body,
  });
}
