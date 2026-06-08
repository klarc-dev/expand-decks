/**
 * Single source of truth for the `k-*` design-system class tokens emitted by
 * the block renderers. These map 1:1 to selectors in `style.css`.
 *
 * Grid classes (`k-grid-2/-3/-4`) are intentionally NOT listed here — they are
 * generated dynamically by `gridClass()` in `utils.ts`, which clamps the column
 * count to the [2,4] range that actually has CSS rules.
 */
export const K = {
  eyebrow: 'k-eyebrow',
  eyebrowDark: 'k-eyebrow-dark',
  card: 'k-card',
  dark: 'k-dark',
  btn: 'k-btn',
  btnGhost: 'k-btn-ghost',
  author: 'k-author',
  quote: 'k-quote',
  num: 'k-num',
  cover: 'k-cover',
  heroBig: 'k-hero-big',
  heroSub: 'k-hero-sub',
  ctaTitle: 'k-cta-title',
  ctaSub: 'k-cta-sub',
  sectionNum: 'k-section-num',
  split: 'k-split',
  divider: 'k-divider',
  stat: 'k-stat',
  table: 'k-table',
  foot: 'k-foot',
  defItem: 'k-def-item',
  defFooter: 'k-def-footer',
  defRef: 'k-def-ref',
} as const;
