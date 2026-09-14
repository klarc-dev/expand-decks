import type { StatementBlockData, StatementVariant } from '../../blocks/spec/statement';
import { densityFromScore, visibleText } from '../density';
import { heroFrame, type RenderCtx } from '../utils';
import { richTextToHTML } from '../richtext';

export type { StatementBlockData };

const VARIANTS: StatementVariant[] = ['centered-hero', 'pull-quote', 'big-statement', 'split'];

/** Map each variant to heroFrame's align/scale/accentRule axes (typed off
 * heroFrame's own params so adding an axis updates one place). */
const VARIANT_LAYOUT: Record<
  StatementVariant,
  Pick<Parameters<typeof heroFrame>[0], 'align' | 'scale' | 'accentRule'>
> = {
  'centered-hero': { align: 'center', scale: 'hero' },
  'big-statement': { align: 'left', scale: 'display' },
  'pull-quote': { align: 'left', scale: 'title', accentRule: true },
  split: { align: 'split', scale: 'title' },
};

/** Default cartouche label when the footer carries no "Label : …" prefix. */
const TAKEAWAY_LABEL: Record<'fr' | 'en', string> = {
  fr: 'À retenir',
  en: 'Key takeaway',
};

// A short plain-text lead followed by a colon at the start of the first
// paragraph: `<p>L’enjeu : examiner…</p>`. Tags, entities and digits in the
// lead are rejected so a URL, a time ("10:30") or an emphasised opener never
// becomes a cartouche.
const TAKEAWAY_LEAD_RE = /^(\s*(?:<div[^>]*>\s*)?<p(?:\s[^>]*)?>)\s*([^<>&:\d]{2,40}?)\s*:\s+/;

/**
 * Split the footer HTML into a cartouche label and the remaining text. The
 * lead of a "Label : text" footer becomes the label; otherwise the localized
 * default applies and the footer text is kept whole.
 */
export function splitTakeaway(
  footerHtml: string,
  language?: 'fr' | 'en' | null,
): { label: string; html: string } {
  const m = footerHtml.match(TAKEAWAY_LEAD_RE);
  if (m) return { label: m[2]!, html: footerHtml.replace(TAKEAWAY_LEAD_RE, '$1') };
  return { label: TAKEAWAY_LABEL[language ?? 'fr'], html: footerHtml };
}

export function renderStatement(block: StatementBlockData, ctx?: RenderCtx): string {
  // The block's explicit variant wins; otherwise rotate by the index
  // buildSlidesMd assigns, so unset statements still vary (KTD6b — the
  // Section-block lesson: a told-not-enforced capability goes unused). Guard
  // against an out-of-enum value from a pre-variant DB row by validating against
  // the known set before indexing VARIANT_LAYOUT.
  const explicit = block.variant && VARIANTS.includes(block.variant) ? block.variant : null;
  const variant: StatementVariant =
    explicit ?? VARIANTS[(ctx?.variantIndex ?? 0) % VARIANTS.length]!;
  const layout = VARIANT_LAYOUT[variant];
  const bodyHtml = richTextToHTML(block.body);
  const footerHtml = richTextToHTML(block.footer);
  const takeaway = footerHtml ? splitTakeaway(footerHtml, ctx?.language) : null;
  // The takeaway box is padded and set at body size, so its text weighs more
  // than the old footnote line did.
  const density = densityFromScore(
    block.title.length * (layout.scale === 'display' ? 2.2 : 1.5) +
      visibleText(bodyHtml).length +
      visibleText(footerHtml).length * 0.8,
    { compact: 250, dense: 480 },
  );

  return heroFrame({
    eyebrow: block.eyebrow,
    title: block.title,
    body: bodyHtml || undefined,
    caption: takeaway?.html,
    captionLabel: takeaway?.label,
    scale: layout.scale,
    align: layout.align,
    accentRule: layout.accentRule,
    density,
    surface: ctx?.surface ?? 'dark',
  });
}
