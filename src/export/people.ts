import { K } from './classNames';
import { escape, safeHref, telHref } from './utils';

/**
 * Shared person-card rendering — one implementation consumed by every block
 * that displays `intervenants` (cover, cardGrid), so markup and styling stay
 * identical wherever people appear.
 */

export type PersonCard = {
  avatarUrl?: string;
  initials: string;
  name: string;
  title?: string;
  description?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
};

export function vueBoundSrc(url: string): string {
  return `:src='${JSON.stringify(url)}'`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function avatarUrl(value: unknown): string | undefined {
  const avatar = asRecord(value);
  if (!avatar) return undefined;

  const sizes = asRecord(avatar.sizes);
  const thumbnail = asRecord(sizes?.thumbnail);
  const card = asRecord(sizes?.card);
  const localMediaUrl = (media: Record<string, unknown> | null): string | null => {
    const filename = asNonEmptyString(media?.filename);
    return filename ? `./media/${filename}` : null;
  };
  return (
    localMediaUrl(thumbnail) ??
    localMediaUrl(card) ??
    localMediaUrl(avatar) ??
    asNonEmptyString(thumbnail?.url) ??
    asNonEmptyString(card?.url) ??
    asNonEmptyString(avatar.thumbnailURL) ??
    asNonEmptyString(avatar.url) ??
    undefined
  );
}

function initialsFor(label: string): string {
  const parts = label
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || '•';
}

export function userToPerson(user: unknown): PersonCard | null {
  const record = asRecord(user);
  // Unresolved relationship IDs are intentionally ignored. The build runner
  // hydrates relationships; admin preview resolves selected users separately.
  if (!record) return null;

  const email = asNonEmptyString(record.email);
  const name = asNonEmptyString(record.name) ?? email?.split('@')[0] ?? 'Intervenant';
  const title = asNonEmptyString(record.title) ?? undefined;
  const description = asNonEmptyString(record.description) ?? undefined;
  const linkedin = asNonEmptyString(record.linkedin);
  const website = asNonEmptyString(record.website);

  return {
    avatarUrl: avatarUrl(record.avatar),
    initials: initialsFor(name),
    name,
    title,
    description,
    email: email ?? undefined,
    phone: asNonEmptyString(record.phone) ?? undefined,
    // Only https profile URLs become links; anything else is dropped.
    linkedin: linkedin && /^https:\/\//i.test(linkedin) ? linkedin : undefined,
    website: website && /^https:\/\//i.test(website) ? website : undefined,
  };
}

type IntervenantRows =
  | ({ user?: unknown; description?: unknown } | null | undefined)[]
  | null
  | undefined;

/**
 * Contact line under the title: each detail is its own link so the exported
 * PDF carries a mailto:/tel:/https annotation per item. Returns '' when the
 * person has no contact detail.
 */
// Inline the small, stable SVG paths: exports stay self-contained without pulling
// React's server renderer into Next's application module graph.
const contactSvg = {
  email:
    '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icons-tabler-outline icon-tabler-mail tabler-icon tabler-icon-mail" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M3 7l9 6l9 -6"/></svg>',
  phone:
    '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icons-tabler-outline icon-tabler-phone tabler-icon tabler-icon-phone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/></svg>',
  linkedin:
    '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-linkedin tabler-icon tabler-icon-brand-linkedin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 11v5"/><path d="M8 8v.01"/><path d="M12 16v-5"/><path d="M16 16v-3a2 2 0 0 0 -4 0"/><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"/></svg>',
  website:
    '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icons-tabler-outline icon-tabler-world tabler-icon tabler-icon-world" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/></svg>',
} as const;

function contactLink(kind: keyof typeof contactSvg, href: string, label: string): string {
  return `<a class="${K.personLink}" href="${escape(href)}" aria-label="${escape(label)}" title="${escape(label)}">${contactSvg[kind]}</a>`;
}

function personContacts(person: PersonCard): string {
  const items: string[] = [];
  const mailto = person.email ? safeHref(`mailto:${person.email}`) : null;
  if (mailto && person.email) {
    items.push(contactLink('email', mailto, person.email));
  }
  const tel = telHref(person.phone);
  if (tel && person.phone) {
    items.push(contactLink('phone', tel, person.phone));
  }
  const linkedin = safeHref(person.linkedin);
  if (linkedin) {
    items.push(contactLink('linkedin', linkedin, 'LinkedIn'));
  }
  const website =
    person.website && /^https?:\/\/\S+$/i.test(person.website) ? safeHref(person.website) : null;
  if (website) items.push(contactLink('website', website, 'Profil Klarc'));
  if (items.length === 0) return '';
  return `\n      <div class="${K.personContact}">${items.join('')}</div>`;
}

export function personCard(person: PersonCard): string {
  const avatar = person.avatarUrl
    ? `<img class="${K.personAvatar}" ${vueBoundSrc(person.avatarUrl)} alt="" />`
    : `<span class="${K.personAvatar} ${K.personInitials}" aria-hidden="true">${escape(person.initials)}</span>`;
  const title = person.title
    ? `\n      <div class="${K.personTitle}">${escape(person.title)}</div>`
    : '';
  const description = person.description
    ? `\n      <div class="${K.personDescription}">${escape(person.description)}</div>`
    : '';
  // The name itself links to the email (the primary way to reach a contact);
  // the contact line below repeats it as text plus phone and LinkedIn.
  const mailto = person.email ? safeHref(`mailto:${person.email}`) : null;
  const name = mailto
    ? `<a href="${escape(mailto)}">${escape(person.name)}</a>`
    : escape(person.name);
  return `<div class="${K.personCard}">
    ${avatar}
    <div class="${K.personBody}">
      <div class="${K.personName}">${name}</div>${title}${description}${personContacts(person)}
    </div>
  </div>`;
}

/**
 * Render an `intervenants` relationship array as a wrapped strip of person
 * cards. Returns '' when no resolvable person exists. `wrapperClass` picks the
 * per-block placement class (cover people band, card-grid contact strip…).
 */
export function renderPeopleStrip(rows: IntervenantRows, wrapperClass: string): string {
  const people = (rows ?? [])
    .map((row) => {
      const record = asRecord(row);
      const person = userToPerson(record?.user);
      if (!person) return null;
      return {
        ...person,
        ...(asNonEmptyString(record?.description)
          ? { description: asNonEmptyString(record?.description)! }
          : {}),
      } satisfies PersonCard;
    })
    .filter((person): person is PersonCard => Boolean(person));

  if (people.length === 0) return '';

  const cards = people.map(personCard).join('\n');
  // No leading indentation: inside Slidev markdown a 4+ space indent after a
  // blank line becomes an indented code block and breaks Vue template parsing.
  return `<div class="${wrapperClass}" aria-label="Intervenants">\n${cards}\n</div>`;
}
