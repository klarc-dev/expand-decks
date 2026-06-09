import type { SectionBlockData } from '../../blocks/spec/section';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { escape, md, surfaceClass, wrapSlide, type RenderCtx, type SlideImage } from '../utils';

export type { SectionBlockData };

export function renderSection(block: SectionBlockData, ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const number = block.number
    ? `\n<div class="${K.sectionNum} mb-4">${escape(block.number)}</div>`
    : '';

  // With image: left-align in the content half rather than centering.
  const subtitleAlign = image ? 'max-w-2xl' : 'max-w-3xl mx-auto';
  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml
    ? `\n\n<div class="k-center-hero-sub ${subtitleAlign}">\n${subtitleHtml}\n</div>`
    : '';

  // Image variant left-aligns; otherwise the centered-hero treatment.
  const wrapperClass = image ? 'k-center-hero k-center-hero--left' : 'k-center-hero';

  const body = `<div class="${wrapperClass}">
${number}
<h1 class="k-center-hero-title">
${md(block.title)}
</h1>${subtitle}

</div>`;

  // section/cover/cta default dark; an explicit block.surface or resolved tone wins.
  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(block.surface ?? ctx?.surface),
    hideChrome: true,
    image,
    body,
  });
}
