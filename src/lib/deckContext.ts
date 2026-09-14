import type { Organisation, Presentation } from '@/payload-types';

/**
 * Build a short, use-case-agnostic deck-context block from a presentation's own
 * metadata, to be prepended to the user's brief so the AI drafts deck-aware
 * output (e.g. honours the deck's language) — without baking domain vocabulary
 * into the shared system prompt.
 *
 * Only fields that exist on the collection are read: `title`, `language`,
 * `tags`, plus the linked organisation's public contact details when the
 * relationship is populated — the only URLs the agent may turn into links
 * (CTA buttons, footer notes). There is no `client`/`audience` field. Empty
 * fields are omitted, and an entirely empty deck yields an empty string (the
 * brief is used as-is).
 */
export function deckContext(
  p: Pick<Presentation, 'title' | 'language' | 'tags'> & {
    organisation?: number | Partial<Organisation> | null;
  },
): string {
  const lines: string[] = [];
  if (p.title) lines.push(`Titre : ${p.title}`);
  if (p.language) lines.push(`Langue : ${p.language}`);
  const tags = Array.isArray(p.tags) ? p.tags.filter(Boolean) : [];
  if (tags.length) lines.push(`Mots-clés : ${tags.join(', ')}`);
  lines.push(...organisationContactLines(p.organisation));
  return lines.length ? `CONTEXTE DE LA PRÉSENTATION :\n${lines.join('\n')}\n\n---\n\n` : '';
}

const ORG_CONTACT_LABELS: [keyof Organisation, string][] = [
  ['website', 'Site web'],
  ['contactEmail', 'Email de contact'],
  ['phone', 'Téléphone'],
  ['bookingUrl', 'Prise de rendez-vous'],
  ['linkedin', 'LinkedIn'],
];

function organisationContactLines(
  org: number | Partial<Organisation> | null | undefined,
): string[] {
  if (!org || typeof org !== 'object') return [];
  const details = ORG_CONTACT_LABELS.flatMap(([key, label]) => {
    const value = org[key];
    return typeof value === 'string' && value.trim() ? [`${label} : ${value.trim()}`] : [];
  });
  if (details.length === 0) return [];
  const name = typeof org.name === 'string' && org.name.trim() ? ` (${org.name.trim()})` : '';
  return [
    `Coordonnées de l’organisation${name}, seules URL autorisées dans les liens :`,
    ...details,
  ];
}
