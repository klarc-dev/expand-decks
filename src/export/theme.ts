/**
 * Per-organisation theming for the Slidev build.
 *
 * The base `style.css` defines the 12 `--k-*` design tokens with Klarc defaults.
 * An Organisation stores only FOUR source colors (primary, secondary, ink,
 * paper); every shade (teal-50…900, rose-soft, ink-soft, line) is derived here
 * with CSS `color-mix` so there is no stored redundancy. The generated `:root`
 * block is appended AFTER the base CSS, so the cascade lets it override the
 * defaults while empty/missing org fields fall back to base.
 *
 * Pure module: no Payload/Next/fs imports, fully unit-testable.
 */

import type { DeckLanguage } from '../agents/language';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface OrgBrand {
  primary: string;
  secondary: string;
  ink: string;
  paper: string;
  headingFont: string;
  bodyFont: string;
}

const isHex = (c: unknown): c is string => typeof c === 'string' && HEX_RE.test(c);

function fontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[\r\n"'\\]/g, '').trim();
  return clean || fallback;
}

function cssFontStack(value: unknown, fallback: string): string {
  return `"${fontFamily(value, fallback)}", ui-sans-serif, system-ui, sans-serif`;
}

const LOCAL_FONT_FAMILIES = new Set(['Gilroy', 'Newsreader', 'IBM Plex Sans', 'IBM Plex Mono']);

/** `color-mix(in srgb, <base> <pct>%, <towards>)` — clamps pct to [0,100]. */
function mix(base: string, pct: number, towards: 'black' | 'white' | 'transparent'): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `color-mix(in srgb, ${base} ${p}%, ${towards})`;
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function luminance(hex: string): number {
  const channels = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** Use the brand ink on bright primary fields rather than assuming white always reads. */
function onPrimary(primary: string, ink: string): string {
  return contrast(primary, '#ffffff') >= 4.5
    ? '#ffffff'
    : contrast(primary, ink) >= 4.5
      ? ink
      : '#000000';
}

/**
 * Build the `:root { … }` override for an organisation's brand. Returns '' when
 * the brand is null or colors are invalid, so the base CSS stays authoritative.
 */
export function buildThemeCss(
  brand: Partial<OrgBrand> | null | undefined,
  selector = ':root',
): string {
  if (!brand) return '';
  const { primary, secondary, ink, paper } = brand;
  if (!isHex(primary) || !isHex(secondary) || !isHex(ink) || !isHex(paper)) return '';

  const foreground = onPrimary(primary, ink);
  const lightForeground = foreground === '#ffffff';
  const muted = lightForeground && contrast(primary, '#c7d6d6') >= 4.5 ? '#c7d6d6' : foreground;

  return `${selector} {
  --k-teal: ${primary};
  --k-on-primary: ${foreground};
  --k-on-primary-muted: ${muted};
  --k-primary-logo-filter: ${lightForeground ? 'none' : 'brightness(0)'};
  --k-teal-600: ${mix(primary, 88, 'black')};
  --k-teal-700: ${mix(primary, 75, 'black')};
  --k-teal-900: ${mix(primary, 40, 'black')};
  --k-teal-50: ${mix(primary, 8, 'white')};
  --k-teal-100: ${mix(primary, 16, 'white')};
  --k-teal-300: ${mix(primary, 45, 'white')};
  --k-rose: ${secondary};
  --k-rose-soft: ${mix(secondary, 30, 'white')};
  --k-ink: ${ink};
  --k-ink-soft: ${mix(ink, 70, 'white')};
  --k-paper: ${paper};
  --k-line: ${mix(primary, 12, 'transparent')};
  --k-surface: ${mix(paper, 70, 'white')};
  --k-surface-raised: ${mix(paper, 42, 'white')};
  --k-surface-soft: color-mix(in srgb, ${paper} 88%, ${primary});
  --k-hairline: ${mix(primary, 16, 'transparent')};
  --k-shadow-soft: 0 18px 44px -34px ${mix(primary, 34, 'transparent')};
  --k-shadow-lift: 0 24px 58px -42px ${mix(primary, 42, 'transparent')};
  --k-font-heading: ${cssFontStack(brand.headingFont, 'Newsreader')};
  --k-font-body: ${cssFontStack(brand.bodyFont, 'IBM Plex Sans')};
}
`;
}

/**
 * Rewrite the static headmatter's font + lang lines for this build:
 * `fonts.local` → heading font, `fonts.sans` → body font, `htmlAttrs.lang` →
 * the presentation language (the base file hardcodes `fr`). Unmatched lines are
 * left untouched, so this is safe even if the headmatter shape evolves.
 */
export function buildHeadmatter(
  base: string,
  brand: Partial<OrgBrand> | null | undefined,
  language?: DeckLanguage | null,
): string {
  // Anchored to the exact 2-space-indented keys under `fonts:` / `htmlAttrs:`
  // in headmatter.yaml so a future top-level key containing "sans"/"local"/
  // "lang" can't be rewritten by accident. `fonts.sans` lists both selected
  // families so Slidev's default Google Fonts provider imports them via the CSS2
  // API; `fonts.local: Gilroy` prevents a futile CDN lookup for our bundled
  // brand font while leaving other families fetched from Google.
  let out = base;
  if (brand?.bodyFont || brand?.headingFont) {
    const bodyFont = fontFamily(brand?.bodyFont, 'IBM Plex Sans');
    const headingFont = fontFamily(brand?.headingFont, 'Newsreader');
    const remoteFonts = Array.from(
      new Set([bodyFont, headingFont].filter((font) => !LOCAL_FONT_FAMILIES.has(font))),
    );
    if (remoteFonts.length > 0) {
      out = out.replace(/^(  sans:[ \t]*).*$/m, `$1${remoteFonts.join(',')}`);
    }
  }
  if (language) {
    out = out.replace(/^(  lang:[ \t]*).*$/m, `$1${language}`);
  }
  return out;
}
