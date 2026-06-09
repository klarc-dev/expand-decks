/**
 * Slidev Mermaid setup — staged into the build workdir as `setup/mermaid.ts`.
 *
 * This is Slidev's official theming hook (the default export is the Mermaid
 * config object; Slidev calls it client-side). We don't import `@slidev/types`'
 * `defineMermaidSetup` helper — it's an identity wrapper and isn't a runtime dep
 * of the isolated slidev-workspace — so a plain default-exported function keeps
 * this dependency-free.
 *
 * Two jobs:
 *  - `flowchart.useMaxWidth: true` makes Mermaid emit an SVG with `max-width:
 *    100%` instead of a hard pixel width, so the .k-mermaid CSS can scale it to
 *    fit the fixed 1280×720 canvas (the diagrams were overflowing the slide and
 *    getting clipped to near-blank in the PDF export).
 *  - `theme: 'base' + themeVariables` paints the graph in the Klarc palette
 *    (teal nodes/edges, rose accents) instead of Mermaid's default lavender.
 */
const KLARC = {
  teal: '#02585c',
  teal700: '#023c3f',
  teal50: '#ecf7f7',
  rose: '#f5a3b0',
  ink: '#0f2a2b',
  line: '#cfe0e0',
  white: '#ffffff',
};

export default () => ({
  theme: 'base',
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  themeVariables: {
    fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
    // Process / task nodes
    primaryColor: KLARC.teal50,
    primaryBorderColor: KLARC.teal,
    primaryTextColor: KLARC.ink,
    // Edges + labels
    lineColor: KLARC.teal700,
    edgeLabelBackground: KLARC.white,
    // Decision nodes / secondary
    secondaryColor: KLARC.white,
    tertiaryColor: KLARC.teal50,
    tertiaryBorderColor: KLARC.rose,
  },
});
