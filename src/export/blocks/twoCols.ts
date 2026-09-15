import type { TwoColsBlockData } from '../../blocks/spec/twoCols';
import { K } from '../classNames';
import { cardScaleClass, densityFromScore, visibleText } from '../density';
import { personCard, userToPerson } from '../people';
import { richTextToHTML } from '../richtext';
import {
  card,
  cardStack,
  contentFrame,
  slideHeader,
  splitTakeaway,
  takeawayBox,
  wrapSlide,
  type RenderCtx,
  type SlideImage,
} from '../utils';

export type { TwoColsBlockData };

export function renderTwoCols(block: TwoColsBlockData, ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  // <div> not <p>: richTextToHTML emits its own block-level <p>.
  const leadHtml = richTextToHTML(block.lead);
  const introHtml = richTextToHTML(block.intro);
  // No divider before the intro: the unified header (pill, title, lead)
  // already separates the copy column from the slide top.
  const intro = introHtml
    ? `\n<div class="k-copy-stack k-copy-stack--lead">\n${introHtml}\n</div>`
    : '';

  // The closing note of the copy column is the slide's takeaway: same box and
  // cartouche as the statement footer, not a grey footnote under a hairline.
  const leftFooterHtml = richTextToHTML(block.leftFooter);
  const leftFooter = leftFooterHtml
    ? (() => {
        const takeaway = splitTakeaway(leftFooterHtml, ctx?.language);
        return `\n${takeawayBox(takeaway.html, takeaway.label, K.takeawaySide)}`;
      })()
    : '';
  const leftPerson = userToPerson(block.leftUser);
  const leftUser = leftPerson
    ? `\n<div class="k-two-cols-user">\n${personCard(leftPerson)}\n</div>`
    : '';

  const leftBody =
    intro || leftFooter || leftUser
      ? `<div class="k-copy-column">${intro}${leftUser}${leftFooter}\n</div>`
      : '';
  const cardList = block.rightCards ?? [];
  const renderedCards = cardList.map((item) => {
    const body = richTextToHTML(item.description);
    return {
      html: card({ title: item.title, body }),
      pressure: item.title.length + visibleText(body).length,
    };
  });
  const density = densityFromScore(
    Math.max(0, ...renderedCards.map((item) => item.pressure)) +
      visibleText(leadHtml).length * 0.6 +
      visibleText(introHtml).length * 0.75 +
      visibleText(leftFooterHtml).length * 0.7 +
      (leftPerson ? 110 : 0) +
      cardList.length * (image ? 72 : 58),
    { compact: image ? 250 : 310, dense: image ? 430 : 520 },
  );
  const scaleClass = cardScaleClass(density);
  const header = slideHeader({
    eyebrow: block.eyebrow,
    title: block.title,
    lead: leadHtml || undefined,
    density,
  });

  // Image variant: image takes the right slot via Slidev's image-right layout;
  // rightCards, when present, stay in the content column instead of being dropped.
  if (image) {
    const cards = renderedCards.map((item) => item.html);
    const stack = cardStack(cards, { layout: 'column', className: scaleClass, density });
    const body = [leftBody, stack.html].filter(Boolean).join('\n\n');
    return wrapSlide({
      image,
      body: contentFrame(body, { header, crowded: stack.crowded, density }),
    });
  }

  // No titleClass override: card titles must render at the shared .k-card h3
  // size (var(--t-h3)) whether the card sits in a cardGrid or a twoCols column.
  // The old 'text-sm' made twoCols card titles smaller than cardGrid ones.
  const cards = renderedCards.map((item) => item.html);
  const stack = cardStack(cards, { layout: 'column', className: scaleClass, density });
  const rightCol = cards.length ? `\n<div class="k-split-cards">${stack.html}\n</div>` : '';
  const leftCol = leftBody || (rightCol ? '<div></div>' : '');
  const main = `<div class="${K.split} k-split--body">\n${leftCol}${rightCol}\n</div>`;
  const body = contentFrame(main, {
    header,
    crowded: stack.crowded,
    density,
    mainAlign: 'start',
  });

  return wrapSlide({ surface: ctx?.surface, body });
}
