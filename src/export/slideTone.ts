import type { Surface } from './utils';

/** Fixed visual surface owned by each layout template, never by authored data. */
const TEMPLATE_SURFACES: Record<string, Surface> = {
  cover: 'gradient',
  section: 'dark',
  statement: 'dark',
  cta: 'dark',
  agenda: 'light',
  twoCols: 'light',
  cardGrid: 'light',
  stats: 'light',
  quotes: 'light',
  table: 'light',
  timeline: 'light',
  mermaid: 'light',
  markdown: 'light',
};

export function slideTone(blockType: string, _prevTone: Surface | null): Surface {
  return TEMPLATE_SURFACES[blockType] ?? 'light';
}
