import type { TimelineBlockData } from '../../blocks/spec/timeline';
import { K } from '../classNames';
import { densityClass, sequenceFrameFit } from '../density';
import { richTextToHTML } from '../richtext';
import { contentFrame, md, slideHeader, surfaceClass, wrapSlide, type RenderCtx } from '../utils';

export type { TimelineBlockData };

export function renderTimeline(block: TimelineBlockData, ctx?: RenderCtx): string {
  const steps = block.steps ?? [];
  const leadHtml = richTextToHTML(block.lead);
  const fit = sequenceFrameFit({
    profile: 'timeline',
    header: `${block.eyebrow ?? ''} ${block.title} ${leadHtml}`,
    items: steps,
  });
  const { density } = fit;
  const vertical = fit.mode === 'vertical';

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

  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density,
  });
  const bodyHtml = contentFrame(timeline, {
    header,
    wFull: true,
    crowded: fit.crowded,
    density,
  });

  return wrapSlide({ classAttr: surfaceClass(ctx?.surface ?? 'light'), body: bodyHtml });
}
