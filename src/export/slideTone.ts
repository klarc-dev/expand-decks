import type { Surface } from './utils';

/**
 * Resolve a slide's light/dark tone by ROLE, not blockType accident (RC4/U6).
 * A running fold carries the previously-resolved tone so `statement` alternates
 * against its real neighbour — surviving interleaved `Section` dividers and
 * reordering (KTD5b), which raw index parity would not.
 *
 *   section / cover / cta            → dark   (full-bleed beats)
 *   table / twoCols / cardGrid / stats / timeline / quotes / markdown → light
 *   statement                        → opposite of the previous slide's tone
 */
const DARK_ROLES = new Set(['section', 'cover', 'cta']);

export function slideTone(blockType: string, prevTone: Surface | null): Surface {
  if (DARK_ROLES.has(blockType)) return 'dark';
  if (blockType === 'statement') return prevTone === 'dark' ? 'light' : 'dark';
  return 'light';
}
