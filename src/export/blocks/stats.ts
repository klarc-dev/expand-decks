import { escape, md, surfaceClass, wrapSlide } from '../utils';

export type StatsBlockData = {
  blockType: 'stats';
  eyebrow?: string | null;
  title: string;
  surface?: 'dark' | 'light' | null;
  stats?: Array<{
    value: string;
    label: string;
  }> | null;
};

export function renderStats(block: StatsBlockData): string {
  const stats = block.stats ?? [];
  const statCount = stats.length || 4;

  const eyebrow = block.eyebrow
    ? `\n<div class="k-eyebrow mb-10">${escape(block.eyebrow)}</div>`
    : '';

  const items = stats
    .map((stat) => {
      return `<div>\n  <div class="k-stat">\n    <span class="val">${escape(stat.value)}</span>\n    <span class="lbl">${escape(stat.label)}</span>\n  </div>\n</div>`;
    })
    .join('\n\n');

  const body = `<div class="text-center max-w-5xl px-12">
${eyebrow}
<h1 class="text-6xl mb-10">
${md(block.title)}
</h1>

<div class="grid grid-cols-${statCount} gap-6 mt-16 max-w-4xl mx-auto">

${items}

</div>

</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(block.surface),
    body,
  });
}
