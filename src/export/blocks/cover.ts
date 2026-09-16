import type { CoverBlockData } from '../../blocks/spec/cover';
import { K } from '../classNames';
import { densityClass, heroSurfaceFit } from '../density';
import { renderPeopleStrip, vueBoundSrc } from '../people';
import { richTextToHTML } from '../richtext';
import { defFooterSlot, eyebrowGroup, md, wrapSlide, type RenderCtx } from '../utils';

export type { CoverBlockData };

export function renderCover(block: CoverBlockData, _ctx?: RenderCtx): string {
  // Prefer the staged local media path over the hydrated Payload API URL: the
  // Slidev export browser has no authenticated session (see
  // authenticated-media-embedding); stageBuildDir copies /media/<filename>
  // into the workdir's public/ dir from the frontmatter reference.
  const imageFilename =
    typeof (block.image as Record<string, unknown> | undefined)?.filename === 'string'
      ? ((block.image as Record<string, unknown>).filename as string)
      : null;
  const imageUrl = imageFilename ? `./media/${imageFilename}` : (block.image?.url ?? null);
  const imagePosition = block.imagePosition ?? 'right';

  const pillTexts = block.pills?.length
    ? block.pills.map((pill) => pill.text)
    : block.eyebrow
      ? [block.eyebrow]
      : [];
  const eyebrow = eyebrowGroup(pillTexts, 'k-eyebrow--cover', {
    icon: true,
    variant: block.pillVariant,
  });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml ? `\n      <div class="${K.heroSub}">${subtitleHtml}</div>` : '';
  const people = renderPeopleStrip(block.intervenants, K.coverPeople);
  const density = heroSurfaceFit({
    profile: 'cover',
    title: block.title,
    subtitle: subtitleHtml,
    hasImage: Boolean(imageUrl),
    peopleCount: block.intervenants?.length ?? 0,
  });

  // With image: split layout — the image renders as an explicit <img> column
  // inside the slide body. Slidev's built-in image-right/-left layouts paint the
  // picture as a CSS background-image, which the Chromium print/export pass
  // drops (page.pdf renders the pane blank), so the cover owns its own figure
  // column instead. Without an image the cover goes full-bleed over the whole
  // slide. Both behaviours are CSS-owned (k-cover sets height:100%;
  // k-cover--split adds the two-column grid; k-cover--full-bleed adds the
  // absolute inset overlay).
  const wrapperClass = [
    K.cover,
    imageUrl ? K.coverSplit : K.coverFullBleed,
    imageUrl && imagePosition === 'left' ? K.coverSplitLeft : '',
    densityClass(density),
  ]
    .filter(Boolean)
    .join(' ');

  const figure = imageUrl
    ? `\n  <div class="${K.coverFigure}" aria-hidden="true"><img class="${K.coverFigureImg}" ${vueBoundSrc(imageUrl)} alt="" /></div>`
    : '';

  const body = `<div class="${wrapperClass}">
  <div class="${K.coverMain}">
    <div class="${K.coverCopy}">${eyebrow}
      <h1 class="${K.coverTitle} ${K.heroBig}">${md(block.title)}</h1>${subtitle}${people}
    </div>
  </div>${figure}
  ${defFooterSlot()}
</div>`;

  return wrapSlide({ layout: 'cover', surface: 'gradient', hideChrome: true, body });
}
