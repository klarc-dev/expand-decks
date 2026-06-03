import { escape, eyebrow as renderEyebrow, md, wrapSlide, type SlideImage } from '../utils';

export type TwoColsBlockData = {
  blockType: 'twoCols';
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  leftFooter?: string | null;
  rightCards?: Array<{
    title: string;
    description?: string | null;
  }> | null;
  image?: { url: string } | null;
  imagePosition?: 'right' | 'left' | null;
};

export function renderTwoCols(block: TwoColsBlockData): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const eyebrow = renderEyebrow(block.eyebrow, 'mb-6');

  // Use <div> not <p>: intro often contains markdown lists / multi-paragraphs
  // which Vue's HTML parser refuses inside a <p> (block content auto-closes the
  // paragraph, making the explicit </p> an unbalanced tag).
  const intro = block.intro
    ? `\n\n<hr class="k-divider"/>\n\n<div class="text-base leading-relaxed mb-8 max-w-md">\n\n${md(block.intro)}\n\n</div>`
    : '';

  const leftFooter = block.leftFooter
    ? `\n\n<div class="mt-12 max-w-md">\n  <p class="text-sm opacity-70">${md(block.leftFooter)}</p>\n</div>`
    : '';

  // When an image is set, it takes the right column slot via Slidev's
  // image-right layout, so we drop k-split and rightCards, and render a single
  // content column. rightCards are intentionally ignored in this branch
  // (documented in the block schema's admin description).
  if (image) {
    const body = `<div class="px-14 pt-28">

${eyebrow}
<h2 class="text-5xl mb-6">${md(block.title)}</h2>${intro}${leftFooter}

</div>`;
    return wrapSlide({ image, body });
  }

  const cards = (block.rightCards ?? [])
    .map((card) => {
      // <div>, not <p>: descriptions may contain markdown lists / paragraphs
      // which Vue's parser refuses inside a <p>.
      const desc = card.description
        ? `\n\n<div>\n\n${md(card.description)}\n\n</div>`
        : '';
      return `<div class="k-card">\n  <h3 class="text-sm">${escape(card.title)}</h3>${desc}\n</div>`;
    })
    .join('\n\n');

  const rightCol = cards ? `\n<div class="space-y-3">\n\n${cards}\n\n</div>` : '';

  const body = `<div class="k-split px-14 pt-28">

<div>
${eyebrow}
<h2 class="text-5xl mb-6">${md(block.title)}</h2>${intro}${leftFooter}

</div>
${rightCol}
</div>`;

  return wrapSlide({ body });
}
