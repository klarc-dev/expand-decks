import type { Presentation } from '@/payload-types';

/**
 * Build a short, use-case-agnostic deck-context block from a presentation's own
 * metadata, to be prepended to the user's brief so the AI drafts deck-aware
 * output (e.g. honours the deck's language) — without baking domain vocabulary
 * into the shared system prompt.
 *
 * Only fields that exist on the collection are read: `title`, `language`,
 * `tags`. There is no `client`/`audience` field. Empty fields are omitted, and
 * an entirely empty deck yields an empty string (the brief is used as-is).
 */
export function deckContext(p: Pick<Presentation, 'title' | 'language' | 'tags'>): string {
  const lines: string[] = [];
  if (p.title) lines.push(`Titre : ${p.title}`);
  if (p.language) lines.push(`Langue : ${p.language}`);
  const tags = Array.isArray(p.tags) ? p.tags.filter(Boolean) : [];
  if (tags.length) lines.push(`Mots-clés : ${tags.join(', ')}`);
  return lines.length ? `CONTEXTE DE LA PRÉSENTATION :\n${lines.join('\n')}\n\n---\n\n` : '';
}
