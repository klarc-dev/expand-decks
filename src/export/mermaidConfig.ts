import type { MermaidConfig } from 'mermaid';

const KLARC = {
  teal: '#02585c',
  teal700: '#023c3f',
  teal50: '#ecf7f7',
  rose: '#f5a3b0',
  ink: '#0f2a2b',
  line: '#cfe0e0',
  white: '#ffffff',
};

export function buildMermaidConfig(): MermaidConfig {
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
    themeVariables: {
      fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
      primaryColor: KLARC.teal50,
      primaryBorderColor: KLARC.teal,
      primaryTextColor: KLARC.ink,
      lineColor: KLARC.teal700,
      edgeLabelBackground: KLARC.white,
      secondaryColor: KLARC.white,
      tertiaryColor: KLARC.teal50,
      tertiaryBorderColor: KLARC.rose,
    },
  } as const;
}
