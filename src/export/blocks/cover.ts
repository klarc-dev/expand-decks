import { K } from '../classNames';
import { escape, eyebrow as renderEyebrow, md, wrapSlide, type SlideImage } from '../utils';

export type CoverBlockData = {
  blockType: 'cover';
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  footerLeft?: string | null;
  footerRight?: string | null;
  surface?: 'dark' | 'light' | 'gradient' | null;
  image?: { url: string } | null;
  imagePosition?: 'right' | 'left' | null;
};

export function renderCover(block: CoverBlockData): string {
  const isDark = block.surface !== 'light';
  const darkClass = isDark ? ' k-dark' : '';

  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-8', { indent: '      ' });

  const subtitle = block.subtitle
    ? `\n      <p class="${K.heroSub}">${md(block.subtitle)}</p>`
    : '';

  const footerLeft = block.footerLeft
    ? `\n    <div class="flex gap-4">\n      <div class="${K.btn}">${escape(block.footerLeft)}</div>\n    </div>`
    : '';

  const footerRight = block.footerRight
    ? `\n    <div class="text-right text-xs opacity-60 tracking-wider uppercase">\n      ${escape(block.footerRight)}\n    </div>`
    : '';

  const footerRow = footerLeft || footerRight
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
