import type { MermaidConfig } from 'mermaid';

import type { OrgBrand } from './theme';

const KLARC = {
  teal: '#02585c',
  teal700: '#023c3f',
  teal50: '#ecf7f7',
  rose: '#f5a3b0',
  ink: '#0f2a2b',
  line: '#cfe0e0',
  white: '#ffffff',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type MermaidBrand = Pick<OrgBrand, 'primary' | 'secondary' | 'ink' | 'paper'>;

function resolvePalette(brand: Partial<OrgBrand> | null | undefined): MermaidBrand {
  const valid =
    brand &&
    typeof brand.primary === 'string' &&
    HEX_RE.test(brand.primary) &&
    typeof brand.secondary === 'string' &&
    HEX_RE.test(brand.secondary) &&
    typeof brand.ink === 'string' &&
    HEX_RE.test(brand.ink) &&
    typeof brand.paper === 'string' &&
    HEX_RE.test(brand.paper);

  if (!valid) {
    return {
      primary: KLARC.teal,
      secondary: KLARC.rose,
      ink: KLARC.ink,
      paper: KLARC.teal50,
    };
  }

  return {
    primary: brand.primary!,
    secondary: brand.secondary!,
    ink: brand.ink!,
    paper: brand.paper!,
  };
}

export function buildMermaidConfig(brand?: Partial<OrgBrand> | null): MermaidConfig {
  const palette = resolvePalette(brand);

  return {
    theme: 'base',
    startOnLoad: false,
    // htmlLabels at top level (flowchart.htmlLabels is deprecated since v11.12).
    htmlLabels: true,
    // useMaxWidth:false → Mermaid emits an SVG with intrinsic width/height + a
    // viewBox (instead of a hard `max-width:Npx` inline style). The .k-diagram
    // CSS then does the sizing with a pure CSS "contain" recipe (max-width/height
    // 100% + width/height auto, centered in a flex box). No per-slide {scale}
    // heuristic, no transform — the SVG is centered on BOTH axes and never clips,
    // identically in the admin preview and the exported PDF.
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
    // Slidev mounts Mermaid output in a ShadowRoot, so deck-level style.css
    // cannot reach the generated SVG. Mermaid injects themeCSS inside that
    // shadow tree, making this the authoritative fixed-canvas containment rule
    // for both the built SPA and Chromium PDF/PNG exports.
    themeCSS: `
      svg {
        display: block;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      .edgeLabel rect,
      .labelBkg {
        fill: ${KLARC.white} !important;
        opacity: 1 !important;
        stroke: ${palette.primary} !important;
        stroke-width: 1px !important;
      }
      .edgeLabel,
      .edgeLabel span,
      .edgeLabel p {
        color: ${palette.ink} !important;
        background-color: ${KLARC.white} !important;
      }
    `,
    themeVariables: {
      fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
      primaryColor: palette.paper,
      primaryBorderColor: palette.primary,
      primaryTextColor: palette.ink,
      lineColor: palette.primary,
      // Transparent edge-label chip: the label sits on the slide ground (cream
      // paper, tinted diagram panel, …) instead of a white sticker that clashes
      // with non-white backgrounds.
      edgeLabelBackground: 'transparent',
      secondaryColor: palette.paper,
      tertiaryColor: palette.paper,
      tertiaryBorderColor: palette.secondary,
    },
  } as const;
}

export function buildMermaidConfigSource(brand: Partial<OrgBrand> | null | undefined): string {
  const config = JSON.stringify(buildMermaidConfig(brand), null, 2);
  return `import type { MermaidConfig } from 'mermaid';\n\nexport function buildMermaidConfig(): MermaidConfig {\n  return ${config} as MermaidConfig;\n}\n`;
}
