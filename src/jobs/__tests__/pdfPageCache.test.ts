import { isAbsolute, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MEDIA_DIR, PAGE_CACHE_DIR } from '../../lib/paths';
import { cachePagePath, currentPagePath, tempPagePath } from '../pdfPageCache';

describe('pdfPageCache', () => {
  it('keeps the cache outside public generated artifact directories', () => {
    expect(PAGE_CACHE_DIR.startsWith(MEDIA_DIR)).toBe(false);
    expect(PAGE_CACHE_DIR.includes(`${join('public')}`)).toBe(false);
    expect(PAGE_CACHE_DIR.includes(`${join('dist')}`)).toBe(false);
  });

  it('returns page paths inside the private cache root', () => {
    const path = cachePagePath('deck-slug', 'build-token', 3);
    const rel = relative(PAGE_CACHE_DIR, path);

    expect(rel).toBe(join('deck-slug', 'build-token', '3.pdf'));
    expect(rel.startsWith('..')).toBe(false);
    expect(isAbsolute(rel)).toBe(false);
  });

  it('rejects traversal and unsafe cache path segments', () => {
    expect(() => cachePagePath('../deck', 'build-token', 0)).toThrow(/Invalid/);
    expect(() => cachePagePath('deck', '../token', 0)).toThrow(/Invalid/);
    expect(() => cachePagePath('deck', 'build-token', -1)).toThrow(/Invalid pageIndex/);
  });

  it('separates current, temp, and swap namespaces under the deck', () => {
    const current = currentPagePath('deck-slug', 0);
    const temp = tempPagePath('deck-slug', 'build-token', 0);

    expect(relative(PAGE_CACHE_DIR, current)).toBe(join('deck-slug', 'current', '0.pdf'));
    expect(relative(PAGE_CACHE_DIR, temp)).toBe(join('deck-slug', 'tmp-build-token', '0.pdf'));
  });
});
