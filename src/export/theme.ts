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

/** `color-mix(in srgb, <base> <pct>%, <towards>)` — clamps pct to [0,100]. */
function mix(base: string, pct: number, towards: 'black' | 'white' | 'transparent'): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `color-mix(in srgb, ${base} ${p}%, ${towards})`;
}

/**
 * Build the `:root { … }` override for an organisation's brand. Returns '' when
 * the brand is null or colors are invalid, so the base CSS stays authoritative.
 */
export function buildThemeCss(brand: Partial<OrgBrand> | null | undefined): string {
  if (!brand) return '';
  const { primary, secondary, ink, paper } = brand;
  if (!isHex(primary) || !isHex(secondary) || !isHex(ink) || !isHex(paper)) return '';

  return `:root {
  --k-teal: ${primary};
  --k-teal-600: ${mix(primary, 88, 'black')};
  --k-teal-700: ${mix(primary, 75, 'black')};
  --k-teal-900: ${mix(primary, 40, 'black')};
  --k-teal-50: ${mix(primary, 8, 'white')};
  --k-teal-100: ${mix(primary, 16, 'white')};
  --k-rose: ${secondary};
  --k-rose-soft: ${mix(secondary, 30, 'white')};
  --k-ink: ${ink};
  --k-ink-soft: ${mix(ink, 70, 'white')};
  --k-paper: ${paper};
  --k-line: ${mix(primary, 12, 'transparent')};
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
  language?: string | null,
): string {
  let out = base;
  if (brand?.bodyFont) {
    out = out.replace(/^(\s*sans:\s*).*$/m, `$1${brand.bodyFont}`);
  }
  if (brand?.headingFont) {
    out = out.replace(/^(\s*local:\s*).*$/m, `$1${brand.headingFont}`);
  }
  if (language) {
    out = out.replace(/^(\s*lang:\s*).*$/m, `$1${language}`);
  }
  return out;
}
