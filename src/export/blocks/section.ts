import type { SectionBlockData } from '../../blocks/spec/section';
import { K } from '../classNames';
import { densityClass, densityFromScore, visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import {
  defFooterSlot,
  escape,
  md,
  surfaceClass,
  wrapSlide,
  type RenderCtx,
  type SlideImage,
} from '../utils';

export type { SectionBlockData };

export function renderSection(block: SectionBlockData, ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const number = block.number ? `\n<div class="${K.sectionNum}">${escape(block.number)}</div>` : '';

  // With image: left-align in the content half rather than centering.
  const subtitleAlign = image ? K.sectionSubNarrow : K.sectionSubWide;
  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml
    ? `\n\n<div class="${K.sectionSub} ${subtitleAlign}">\n${subtitleHtml}\n</div>`
    : '';
  const density = densityFromScore(
    block.title.length * (image ? 2.3 : 1.6) + visibleText(subtitleHtml).length,
    { compact: image ? 170 : 240, dense: image ? 300 : 410 },
  );

  // Image variant left-aligns; otherwise the centered-hero treatment.
  const wrapperClass = [
    'k-center-hero',
    K.sectionFrame,
    image ? 'k-center-hero--left' : '',
    densityClass(density),
  ]
    .filter(Boolean)
    .join(' ');

  const body = `<div class="${wrapperClass}">
  <div class="k-center-hero-main">
${number}
<h1 class="${['k-center-hero-title', densityClass(density)].filter(Boolean).join(' ')}">
${md(block.title)}
</h1>${subtitle}
  </div>
  ${defFooterSlot()}
</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(ctx?.surface ?? 'dark'),
    hideChrome: true,
    image,
    body,
  });
}
