import type { SlideChrome } from '@/components/SlideFrame';

type FormFields = Record<string, { value?: unknown } | undefined>;

function fieldString(fields: FormFields, key: string): string {
  const value = fields[key]?.value;
  return typeof value === 'string' ? value : '';
}

function relationshipName(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.name === 'string') return record.name;
  if (typeof record.label === 'string') return record.label;
  if (record.value && typeof record.value === 'object') return relationshipName(record.value);
  return '';
}

function logoUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const logo = (value as Record<string, unknown>).logo;
  if (!logo || typeof logo !== 'object') return undefined;
  const filename = (logo as Record<string, unknown>).filename;
  return typeof filename === 'string' && filename ? `/media/${filename}` : undefined;
}

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key) => vars[key] ?? '');
}

export function buildSlidePreviewChrome(
  fields: FormFields,
  previewFieldPath: string,
  hideChrome: boolean,
): SlideChrome {
  const slideIndex = Number(previewFieldPath.match(/^slides\.(\d+)\./)?.[1] ?? 0);
  const total =
    Object.keys(fields).filter((key) => /^slides\.\d+\.blockType$/.test(key)).length ||
    slideIndex + 1;
  const language = fieldString(fields, 'language') === 'en' ? 'en-GB' : 'fr-FR';
  const organisation = fields.organisation?.value;
  const orgName = relationshipName(organisation);
  const vars = {
    date: new Date().toLocaleDateString(language),
    'org.name': orgName,
    'organisation.name': orgName,
    page: String(slideIndex + 1),
    title: fieldString(fields, 'title'),
    total: String(total),
  };

  const enabled = fields['footer.enabled']?.value !== false;
  const footer = enabled
    ? {
        left: resolveTemplate(fieldString(fields, 'footer.left') || '{org.name}', vars),
        center: resolveTemplate(fieldString(fields, 'footer.center'), vars),
        right: resolveTemplate(fieldString(fields, 'footer.right') || '{page} / {total}', vars),
      }
    : undefined;

  return {
    footer,
    hidden: hideChrome,
    logoUrl: logoUrl(organisation),
  };
}
