import mermaid from 'mermaid';

import { buildMermaidConfig } from './mermaidConfig';

let sequence = 0;

/**
 * Slidev renders Mermaid markup into a ShadowRoot, so deck CSS cannot size the
 * generated SVG. Normalize its root dimensions before Slidev mounts it: the
 * viewBox remains authoritative and preserveAspectRatio contains the complete
 * graph inside the fixed diagram stage instead of centering an intrinsic-height
 * SVG and clipping its top and bottom.
 */
export default async () => async (code: string, options: Record<string, unknown>) => {
  mermaid.initialize({ ...buildMermaidConfig(), ...options, startOnLoad: false });
  const { svg } = await mermaid.render(`k-mermaid-${sequence++}`, code);

  return svg.replace(/<svg\b([^>]*)>/, (_match: string, attributes: string) => {
    const cleaned = attributes
      .replace(/\s(?:width|height)="[^"]*"/g, '')
      .replace(/\sstyle="[^"]*"/g, '');

    return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%;max-height:100%;overflow:visible">`;
  });
};
