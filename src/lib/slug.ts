export const SLUG_MAX = 64;
export const SLUG_RE = /^[a-z0-9-]{1,64}$/;
export const isValidSlug = (s: string): boolean => SLUG_RE.test(s);

export function slugFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}
