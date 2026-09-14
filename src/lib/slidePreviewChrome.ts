import type { SlideChrome } from '@/components/SlideFrame';
import { pickLogoUrl, resolveLogoUrls } from '@/export/chrome';

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

/** Same variant choice as the Slidev top layer: white on dark, colour on paper. */
function logoUrl(value: unknown, darkSurface: boolean): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return pickLogoUrl(resolveLogoUrls(value as Record<string, unknown>), darkSurface) ?? undefined;
}

function orgFonts(value: unknown): { heading: string; body: string } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const heading = typeof record.headingFont === 'string' ? record.headingFont : '';
  const body = typeof record.bodyFont === 'string' ? record.bodyFont : '';
  if (!heading && !body) return undefined;
  return { heading: heading || 'Gilroy', body: body || 'Roboto' };
}

function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key) => vars[key] ?? '');
}

export function buildSlidePreviewChrome(
  fields: FormFields,
  previewFieldPath: string,
  hideChrome: boolean,
  darkSurface = false,
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
    fonts: orgFonts(organisation),
    hidden: hideChrome,
    logoUrl: logoUrl(organisation, darkSurface),
  };
}
