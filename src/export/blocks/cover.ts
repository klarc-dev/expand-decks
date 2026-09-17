import type { CoverBlockData } from '../../blocks/spec/cover';
import { K } from '../classNames';
import { densityClass, heroSurfaceFit } from '../density';
import { renderPeopleStrip } from '../people';
import { richTextToHTML } from '../richtext';
import { defFooterSlot, eyebrowGroup, md, wrapSlide, type RenderCtx } from '../utils';

export type { CoverBlockData };

export function renderCover(block: CoverBlockData, ctx?: RenderCtx): string {
  const pillTexts = block.pills?.map((pill) => pill.text) ?? [];
  const eyebrow = eyebrowGroup(pillTexts, 'k-eyebrow--cover', {
    icon: true,
    // Cover pills use the primary palette role by layout. This preserves the
    // appearance authored on Klarc presentation 25 without exposing a color
    // choice that can drift between decks.
    variant: 'primary',
  });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml ? `\n      <div class="${K.heroSub}">${subtitleHtml}</div>` : '';
  const people = renderPeopleStrip(block.intervenants, K.coverPeople);
  const density = heroSurfaceFit({
    profile: 'cover',
    title: block.title,
    subtitle: subtitleHtml,
    hasImage: false,
    peopleCount: block.intervenants?.length ?? 0,
  });

  const wrapperClass = [K.cover, K.coverFullBleed, densityClass(density)].filter(Boolean).join(' ');

  const body = `<div class="${wrapperClass}">
  <div class="${K.coverMain}">
    <div class="${K.coverCopy}">${eyebrow}
      <h1 class="${K.coverTitle} ${K.heroBig}">${md(block.title)}</h1>${subtitle}${people}
    </div>
  </div>
  ${defFooterSlot()}
</div>`;

  return wrapSlide({
    layout: 'cover',
    surface: ctx?.surface ?? 'gradient',
    hideChrome: true,
    body,
  });
}
