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
 *  - `flowchart.useMaxWidth: false` lets Mermaid emit an intrinsic SVG/viewBox.
 *    The shared .k-diagram-slide CSS then sizes that SVG with a centered
 *    "contain" layout, so diagrams fit the 1280×720 canvas without transform
 *    scaling, dead bands, or PDF clipping.
 *  - `theme: 'base' + themeVariables` paints the graph in the Klarc palette
 *    (teal nodes/edges, rose accents) instead of Mermaid's default lavender.
 */
import { buildMermaidConfig } from './mermaidConfig';

export default () => buildMermaidConfig();
