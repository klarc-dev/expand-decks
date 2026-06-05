export const SLUG_MAX = 64;
export const SLUG_RE = /^[a-z0-9-]{1,64}$/;
export const isValidSlug = (s: string): boolean => SLUG_RE.test(s);
