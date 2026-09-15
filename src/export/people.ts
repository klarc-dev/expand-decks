import { IconBrandLinkedin, IconMail, IconPhone, IconWorld } from '@tabler/icons-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
  email?: string;
  phone?: string;
  linkedin?: string;
  /** Explicit helper input only: Users has no website field. Never infer from email/org. */
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
  const linkedin = asNonEmptyString(record.linkedin);

  return {
    avatarUrl: avatarUrl(record.avatar),
    initials: initialsFor(name),
    name,
    title,
    email: email ?? undefined,
    phone: asNonEmptyString(record.phone) ?? undefined,
    // Only an https profile URL becomes a link; anything else is dropped.
    linkedin: linkedin && /^https:\/\//i.test(linkedin) ? linkedin : undefined,
  };
}

type IntervenantRows = ({ user?: unknown } | null | undefined)[] | null | undefined;

/**
 * Contact line under the title: each detail is its own link so the exported
 * PDF carries a mailto:/tel:/https annotation per item. Returns '' when the
 * person has no contact detail.
 */
// Pre-render library SVGs once: no icon font, network fetch or React runtime in
// the generated Slidev/PDF. All contact channels share Tabler's outline family.
const contactIcons = {
  email: IconMail,
  phone: IconPhone,
  linkedin: IconBrandLinkedin,
  website: IconWorld,
};
const contactSvg = Object.fromEntries(
  Object.entries(contactIcons).map(([kind, icon]) => [
    kind,
    renderToStaticMarkup(
      createElement(icon, {
        size: 18,
        stroke: 1.75,
        'aria-hidden': true,
        focusable: 'false',
      }),
    ),
  ]),
);

function contactLink(kind: keyof typeof contactIcons, href: string, text: string): string {
  return `<a class="${K.personLink}" href="${escape(href)}">${contactSvg[kind]}<span>${escape(text)}</span></a>`;
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
  if (website) items.push(contactLink('website', website, website));
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
  // The name itself links to the email (the primary way to reach a contact);
  // the contact line below repeats it as text plus phone and LinkedIn.
  const mailto = person.email ? safeHref(`mailto:${person.email}`) : null;
  const name = mailto
    ? `<a href="${escape(mailto)}">${escape(person.name)}</a>`
    : escape(person.name);
  return `<div class="${K.personCard}">
    ${avatar}
    <div class="${K.personBody}">
      <div class="${K.personName}">${name}</div>${title}${personContacts(person)}
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
    .map((row) => userToPerson(asRecord(row)?.user))
    .filter((person): person is PersonCard => Boolean(person));

  if (people.length === 0) return '';

  const cards = people.map(personCard).join('\n');
  // No leading indentation: inside Slidev markdown a 4+ space indent after a
  // blank line becomes an indented code block and breaks Vue template parsing.
  return `<div class="${wrapperClass}" aria-label="Intervenants">\n${cards}\n</div>`;
}
