import type { CtaBlockData } from '../../blocks/spec/cta';
import { K } from '../classNames';
import { densityClass, heroSurfaceFit } from '../density';
import { richTextToHTML } from '../richtext';
import { resolveVars } from '../vars';
import {
  defFooterSlot,
  escape,
  eyebrow as renderEyebrow,
  md,
  locationCardsFromNote,
  safeHref,
  surfaceClass,
  wrapSlide,
  type RenderCtx,
} from '../utils';

// A button with a safe target is an <a> (clickable in the PDF and the SPA);
// without one it stays the plain pill it always was. Variables ({org.bookingUrl})
// are resolved before the URL is checked, so a token can be the whole target.
function actionButton(label: string, url: string | null | undefined, cls: string): string {
  const href = safeHref(resolveVars(url));
  return href
    ? `<a class="${cls}" href="${escape(href)}">${escape(label)}</a>`
    : `<div class="${cls}">${escape(label)}</div>`;
}

export type { CtaBlockData };

export function renderCta(block: CtaBlockData, ctx?: RenderCtx): string {
  const eyebrow = renderEyebrow(block.eyebrow, 'k-eyebrow--cta', {
    extraClass: ctx?.surface === 'light' ? undefined : K.eyebrowDark,
    multiline: true,
  });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml ? `\n\n<div class="${K.ctaSub}">\n  ${subtitleHtml}\n</div>` : '';

  const buttons: string[] = [];
  if (block.primaryAction) {
    buttons.push(actionButton(block.primaryAction, block.primaryActionUrl, K.btn));
  }
  if (block.secondaryAction) {
    buttons.push(actionButton(block.secondaryAction, block.secondaryActionUrl, K.btnGhost));
  }
  const buttonsHtml =
    buttons.length > 0
      ? `\n\n<div class="${K.ctaActions}">\n  ${buttons.join('\n  ')}\n</div>`
      : '';

  // Closing-slide footnote; uses the AA-safe k-caption token plus a CTA-context
  // modifier that owns alignment and spacing in CSS (no inline utilities).
  const footerNoteHtml = richTextToHTML(block.footerNote);
  const locations = locationCardsFromNote(footerNoteHtml, ctx?.language);
  const footerNote = footerNoteHtml
    ? locations
      ? `\n\n${locations}`
      : `\n\n<div class="${K.caption} ${K.ctaCaption}">\n  ${footerNoteHtml}\n</div>`
    : '';
  const density = heroSurfaceFit({
    profile: 'cta',
    title: block.title,
    subtitle: subtitleHtml,
    footer: footerNoteHtml,
    actionLabels: [block.primaryAction, block.secondaryAction].filter((label): label is string =>
      Boolean(label),
    ),
  });

  const body = `<div class="${['k-center-hero', K.ctaFrame, densityClass(density)].filter(Boolean).join(' ')}">
  <div class="k-center-hero-main">
${eyebrow}
<h1 class="${[K.ctaTitle, densityClass(density)].filter(Boolean).join(' ')}">
${md(block.title)}
</h1>${subtitle}${buttonsHtml}${footerNote}
  </div>
  ${defFooterSlot()}
</div>`;

  // cta is the dark closing slide by default; a resolved tone can still override.
  return wrapSlide({
    layout: 'center',
    classAttr: surfaceClass(ctx?.surface ?? 'dark'),
    hideChrome: false,
    body,
  });
}
