import type { TimelineBlockData } from '../../blocks/spec/timeline';
import { K } from '../classNames';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TimelineBlockData };

export function renderTimeline(block: TimelineBlockData, ctx?: RenderCtx): string {
  const steps = block.steps ?? [];

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

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(
    `${header}\n\n<div class="${K.timeline}">\n${nodes}\n</div>${band}`,
    { wFull: true },
  );

  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
