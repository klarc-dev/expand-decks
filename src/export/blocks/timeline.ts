import type { TimelineBlockData } from '../../blocks/spec/timeline';
import { K } from '../classNames';
import { densityClass, densityFromScore } from '../density';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TimelineBlockData };

// Dense progressions (many steps, or long copy) read better stacked vertically
// than crammed into narrow horizontal columns — switch layout on the same signal
// the slide uses for its `crowded` density treatment.
function needsVerticalTimeline(steps: NonNullable<TimelineBlockData['steps']>): boolean {
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
  const vertical = needsVerticalTimeline(steps);
  const density = densityFromScore(
    steps.reduce(
      (score, step) => score + step.label.length * 1.2 + (step.description?.length ?? 0),
      steps.length * 65,
    ),
    { compact: 430, dense: 690 },
  );

  // Each step is a self-contained node; the connecting rail is drawn purely in
  // CSS (a pseudo-element behind the numbered dots), so no arrow glyphs or
  // connector divs leak into the markup. Horizontal mode relies on the parent
  // grid to lock every dot / label / description onto a shared row.
  const nodes = steps
    .map((s, i) => {
      const desc = s.description
        ? `\n    <p class="${K.timelineDesc}">${md(s.description)}</p>`
        : '';
      return `  <div class="${K.timelineStep}">
    <div class="${K.timelineDot}">${i + 1}</div>
    <h3 class="${K.timelineLabel}">${md(s.label)}</h3>${desc}
  </div>`;
    })
    .join('\n');

  const band = block.footer ? `\n\n<div class="${K.timelineBand}">${md(block.footer)}</div>` : '';
  const variant = vertical ? K.timelineVertical : K.timelineHorizontal;
  const timeline = `<div class="${[K.timeline, variant, densityClass(density)].filter(Boolean).join(' ')}" style="--k-tl-count:${steps.length || 1}">\n${nodes}\n</div>${band}`;

  const header = slideHeader({ eyebrow: block.eyebrow, title: block.title, size: 'md', density });
  const bodyHtml = contentFrame(timeline, {
    header,
    wFull: true,
    crowded: vertical,
    density,
  });

  return wrapSlide({ classAttr: surfaceClass(ctx?.surface ?? 'light'), body: bodyHtml });
}
