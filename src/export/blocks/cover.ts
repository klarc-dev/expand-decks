import type { CoverBlockData } from '../../blocks/spec/cover';
import { K } from '../classNames';
import { richTextToHTML } from '../richtext';
import { eyebrow as renderEyebrow, md, wrapSlide, type RenderCtx, type SlideImage } from '../utils';

export type { CoverBlockData };

// ctx is accepted for signature parity with the other renderers (the RENDERERS
// map types every entry with the optional ctx arg). The cover defines its own
// tone (dark unless surface:'light'), so the resolved deck tone is ignored here.
export function renderCover(block: CoverBlockData, _ctx?: RenderCtx): string {
  const isDark = block.surface !== 'light';
  const darkClass = isDark ? ' k-dark' : '';

  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-8', { indent: '      ' });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml ? `\n      <div class="${K.heroSub}">${subtitleHtml}</div>` : '';

  const footerLeftHtml = richTextToHTML(block.footerLeft);
  const footerLeft = footerLeftHtml
    ? `\n    <div class="flex gap-4">\n      <div class="${K.btn}">${footerLeftHtml}</div>\n    </div>`
    : '';

  const footerRightHtml = richTextToHTML(block.footerRight);
  const footerRight = footerRightHtml
    ? `\n    <div class="${K.caption} k-caption--upper text-right">\n      ${footerRightHtml}\n    </div>`
    : '';

  const footerRow =
    footerLeft || footerRight
      ? `\n  <div class="flex items-end justify-between">${footerLeft}${footerRight}\n  </div>`
      : '';

  // With image: half-slide layout (Slidev image-right/-left supplies the other
  // half). Drop `absolute inset-0` so the content flows in Slidev's content
  // slot rather than going full-bleed over the image.
  const wrapperClass = image
    ? `${darkClass.trim()} h-full flex flex-col justify-between p-14 k-cover`.trim()
    : `${darkClass.trim()} absolute inset-0 flex flex-col justify-between p-14 k-cover`.trim();

  const body = `<div class="${wrapperClass}">
  <div class="flex-1 flex items-center">
    <div class="max-w-4xl">${eyebrow}
      <h1 class="${K.heroBig} mb-10">${md(block.title)}</h1>${subtitle}
    </div>
  </div>${footerRow}
</div>`;

  return wrapSlide({ layout: 'cover', classAttr: '', hideChrome: true, image, body });
}
