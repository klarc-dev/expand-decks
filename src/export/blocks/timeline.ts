import type { TimelineBlockData } from '../../blocks/spec/timeline';
import { K } from '../classNames';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TimelineBlockData };

function needsCardTimeline(steps: NonNullable<TimelineBlockData['steps']>): boolean {
  const descriptionLengths = steps.map((s) => s.description?.length ?? 0);
  const totalDescriptionLength = descriptionLengths.reduce((sum, length) => sum + length, 0);
  return (
    steps.length >= 5 ||
    totalDescriptionLength > 520 ||
    descriptionLengths.some((length) => length > 140)
  );
}

export function renderTimeline(block: TimelineBlockData, ctx?: RenderCtx): string {
  const steps = block.steps ?? [];
  const dense = needsCardTimeline(steps);

  const nodes = steps
    .map((s, i) => {
      const arrow = !dense && i > 0 ? `<div class="${K.timelineArrow}">→</div>` : '';
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

  const band = block.footer ? `\n\n<div class="${K.timelineBand}">${md(block.footer)}</div>` : '';
  const timelineClass = dense
    ? `${K.timeline} k-timeline--cards`
    : `${K.timeline} k-timeline--horizontal`;
  const timeline = `<div class="${timelineClass}">\n${nodes}\n</div>${band}`;

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md' });
  const bodyHtml = contentFrame(timeline, {
    header,
    wFull: true,
    crowded: dense,
  });

  return wrapSlide({ classAttr: surfaceClass(block.surface ?? ctx?.surface), body: bodyHtml });
}
