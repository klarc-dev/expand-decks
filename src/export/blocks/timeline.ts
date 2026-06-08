import type { TimelineBlockData } from '../../blocks/spec/timeline';
import { K } from '../classNames';
import { eyebrow as renderEyebrow, md, surfaceClass, wrapSlide } from '../utils';

export type { TimelineBlockData };

export function renderTimeline(block: TimelineBlockData): string {
  const steps = block.steps ?? [];
  const eyebrow = renderEyebrow(block.eyebrow, 'mb-6', { indent: '    ' });

  const nodes = steps
    .map((s, i) => {
      const arrow = i > 0 ? `<div class="${K.timelineArrow}">→</div>` : '';
      const desc = s.description
        ? `\n    <p class="${K.timelineDesc}">${md(s.description)}</p>`
        : '';
      return `${arrow}
  <div class="${K.timelineStep}">
    <div class="${K.timelineDot}">${i + 1}</div>
    <h3 class="${K.timelineLabel}">${md(s.label)}</h3>${desc}
  </div>`;
    })
    .join('\n');

  const band = block.footer
    ? `\n\n<div class="${K.timelineBand}">${md(block.footer)}</div>`
    : '';

  const bodyHtml = `<div class="px-14 pt-24 w-full">

<div class="mb-10">${eyebrow}
  <h2 class="text-4xl">${md(block.title)}</h2>
</div>

<div class="${K.timeline}">
${nodes}
</div>${band}

</div>`;

  return wrapSlide({ classAttr: surfaceClass(block.surface), body: bodyHtml });
}
