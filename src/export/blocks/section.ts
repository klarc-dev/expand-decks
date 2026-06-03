import { escape, md, surfaceClass, wrapSlide, type SlideImage } from '../utils';

export type SectionBlockData = {
  blockType: 'section';
  number?: string | null;
  title: string;
  subtitle?: string | null;
  surface?: 'dark' | 'light' | null;
  image?: { url: string } | null;
  imagePosition?: 'right' | 'left' | null;
};

export function renderSection(block: SectionBlockData): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const number = block.number
    ? `\n<div class="k-section-num mb-4">${escape(block.number)}</div>`
    : '';

  // With image: left-align in the content half rather than centering across
  // the full slide.
  const subtitleAlign = image ? 'max-w-2xl' : 'max-w-3xl mx-auto';
  const subtitle = block.subtitle
    ? `\n\n<p class="text-xl opacity-75 ${subtitleAlign} leading-relaxed">\n${md(block.subtitle)}\n</p>`
    : '';

  const wrapperClass = image
    ? 'max-w-3xl px-12'
    : 'text-center max-w-5xl px-12';

  const body = `<div class="${wrapperClass}">
${number}
<h1 class="text-6xl mb-8">
${md(block.title)}
</h1>${subtitle}

</div>`;

  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(block.surface),
    hideChrome: true,
    image,
    body,
  });
}
