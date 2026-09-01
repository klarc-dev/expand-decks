import type { CoverBlockData } from '../../blocks/spec/cover';
import { K } from '../classNames';
import { densityClass, densityFromScore, visibleText } from '../density';
import { richTextToHTML } from '../richtext';
import {
  defFooterSlot,
  escape,
  eyebrow as renderEyebrow,
  md,
  wrapSlide,
  type RenderCtx,
  type SlideImage,
} from '../utils';

export type { CoverBlockData };

type PersonCard = {
  avatarUrl?: string;
  initials: string;
  name: string;
  title?: string;
};

function vueBoundSrc(url: string): string {
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

function userToPerson(user: unknown): PersonCard | null {
  const record = asRecord(user);
  // Unresolved relationship IDs are intentionally ignored. The build runner
  // hydrates relationships; admin preview resolves selected users separately.
  if (!record) return null;

  const email = asNonEmptyString(record.email);
  const name = asNonEmptyString(record.name) ?? email?.split('@')[0] ?? 'Intervenant';
  const title = asNonEmptyString(record.title) ?? undefined;

  return {
    avatarUrl: avatarUrl(record.avatar),
    initials: initialsFor(name),
    name,
    title,
  };
}

function renderPeople(block: CoverBlockData): string {
  const rows = block.intervenants ?? [];
  const people = rows
    .map((row) => userToPerson(asRecord(row)?.user))
    .filter((person): person is PersonCard => Boolean(person));

  if (people.length === 0) return '';

  const cards = people
    .map((person) => {
      const avatar = person.avatarUrl
        ? `<img class="${K.personAvatar}" ${vueBoundSrc(person.avatarUrl)} alt="" />`
        : `<span class="${K.personAvatar} ${K.personInitials}" aria-hidden="true">${escape(person.initials)}</span>`;
      const title = person.title
        ? `\n      <div class="${K.personTitle}">${escape(person.title)}</div>`
        : '';
      return `<div class="${K.personCard}">
    ${avatar}
    <div class="${K.personBody}">
      <div class="${K.personName}">${escape(person.name)}</div>${title}
    </div>
  </div>`;
    })
    .join('\n');

  return `\n      <div class="${K.coverPeople}" aria-label="Intervenants">\n${cards}\n      </div>`;
}

export function renderCover(block: CoverBlockData, _ctx?: RenderCtx): string {
  const image: SlideImage | null = block.image?.url
    ? { url: block.image.url, position: block.imagePosition ?? 'right' }
    : null;

  const eyebrow = renderEyebrow(block.eyebrow, 'k-eyebrow--cover', { indent: '      ' });

  const subtitleHtml = richTextToHTML(block.subtitle);
  const subtitle = subtitleHtml ? `\n      <div class="${K.heroSub}">${subtitleHtml}</div>` : '';
  const people = renderPeople(block);
  const density = densityFromScore(
    block.title.length * (image ? 2.5 : 1.7) +
      visibleText(subtitleHtml).length +
      (block.intervenants?.length ?? 0) * 70,
    { compact: image ? 180 : 260, dense: image ? 320 : 440 },
  );

  // With image: half-slide layout (Slidev image-right/-left supplies the other
  // half), so the cover fills the content slot. Without an image the cover goes
  // full-bleed over the whole slide. Both behaviours are CSS-owned (k-cover sets
  // height:100%; k-cover--full-bleed adds the absolute inset overlay).
  const wrapperClass = [K.cover, image ? '' : K.coverFullBleed, densityClass(density)]
    .filter(Boolean)
    .join(' ');

  const body = `<div class="${wrapperClass}">
  <div class="${K.coverMain}">
    <div class="${K.coverCopy}">${eyebrow}
      <h1 class="${K.coverTitle} ${K.heroBig}">${md(block.title)}</h1>${subtitle}${people}
    </div>
  </div>
  ${defFooterSlot()}
</div>`;

  return wrapSlide({ layout: 'cover', surface: 'gradient', hideChrome: true, image, body });
}
