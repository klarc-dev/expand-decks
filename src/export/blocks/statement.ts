import type { StatementBlockData, StatementVariant } from '../../blocks/spec/statement';
import { heroFrame, type RenderCtx } from '../utils';
import { richTextToHTML } from '../richtext';

export type { StatementBlockData };

const VARIANTS: StatementVariant[] = ['centered-hero', 'pull-quote', 'big-statement', 'split'];

/** Map each variant to heroFrame's align/scale/accentRule axes. */
const VARIANT_LAYOUT: Record<
  StatementVariant,
  { align: 'center' | 'left' | 'split'; scale: 'hero' | 'display' | 'title'; accentRule?: boolean }
> = {
  'centered-hero': { align: 'center', scale: 'hero' },
  'big-statement': { align: 'left', scale: 'display' },
  'pull-quote': { align: 'left', scale: 'title', accentRule: true },
  split: { align: 'split', scale: 'title' },
};

export function renderStatement(block: StatementBlockData, ctx?: RenderCtx): string {
  // The block's explicit variant wins; otherwise rotate by the index
  // buildSlidesMd assigns, so unset statements still vary (KTD6b — the
  // Section-block lesson: a told-not-enforced capability goes unused).
  const variant: StatementVariant =
    (block.variant as StatementVariant | null | undefined) ??
    VARIANTS[(ctx?.variantIndex ?? 0) % VARIANTS.length]!;
  const layout = VARIANT_LAYOUT[variant];

  return heroFrame({
    eyebrow: block.eyebrow,
    title: block.title,
    body: richTextToHTML(block.body) || undefined,
    caption: richTextToHTML(block.footer) || undefined,
    scale: layout.scale,
    align: layout.align,
    accentRule: layout.accentRule,
    // explicit block.surface wins over the resolved tone (KTD5).
    surface: block.surface ?? ctx?.surface,
  });
}
