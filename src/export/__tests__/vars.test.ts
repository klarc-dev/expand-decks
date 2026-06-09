import { describe, expect, it } from 'vitest';

import { flattenVars, getPath, resolveVarsWith } from '../vars';

describe('getPath', () => {
  it('reads a deep dotted path', () => {
    expect(getPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });
  it('returns undefined on a missing segment', () => {
    expect(getPath({ a: {} }, 'a.b.c')).toBeUndefined();
    expect(getPath(null, 'a')).toBeUndefined();
  });
});

describe('resolveVarsWith', () => {
  const ctx = {
    title: 'Hello',
    organisation: { name: 'Klarc', primary: '#02585C' },
    org: { name: 'Klarc' },
    total: 12,
  };

  it('resolves a known scalar path', () => {
    expect(resolveVarsWith('Deck: {title}', ctx)).toBe('Deck: Hello');
  });

  it('resolves both the org alias and the real relation path', () => {
    expect(resolveVarsWith('{org.name} / {organisation.name}', ctx)).toBe('Klarc / Klarc');
  });

  it('stringifies non-string primitives', () => {
    expect(resolveVarsWith('{total}', ctx)).toBe('12');
  });

  it('leaves unknown paths untouched', () => {
    expect(resolveVarsWith('{nope} {a.b.c}', ctx)).toBe('{nope} {a.b.c}');
  });

  it('leaves non-primitive values untouched (object/array/null)', () => {
    expect(resolveVarsWith('{organisation}', ctx)).toBe('{organisation}');
    expect(resolveVarsWith('{x}', { x: [1, 2] })).toBe('{x}');
    expect(resolveVarsWith('{x}', { x: null })).toBe('{x}');
  });

  it('does NOT touch {{def:…}} footnote tokens', () => {
    expect(resolveVarsWith('{{def:Source Gartner}} and {title}', ctx)).toBe(
      '{{def:Source Gartner}} and Hello',
    );
    // even when the footnote inner text looks path-like
    expect(resolveVarsWith('{{def:org.name}}', ctx)).toBe('{{def:org.name}}');
  });

  it('applies the escaper to substituted values when given', () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;');
    expect(resolveVarsWith('{title}', { title: 'A & B' }, esc)).toBe('A &amp; B');
  });

  it('is a no-op with a null context', () => {
    expect(resolveVarsWith('{title}', null)).toBe('{title}');
  });
});

describe('flattenVars', () => {
  const doc = {
    id: 7,
    title: 'Deck',
    slug: 'deck',
    language: 'fr',
    status: 'draft',
    tags: ['a', 'b'],
    slides: [{ blockType: 'cover' }],
    pdfFile: 99,
    organisation: { name: 'Klarc', primary: '#02585C' },
  };

  it('emits scalar top-level paths and prunes noise/internal keys', () => {
    const paths = flattenVars(doc).map((v) => v.path);
    expect(paths).toContain('title');
    expect(paths).toContain('slug');
    expect(paths).toContain('language');
    // pruned: id, status, tags(array), slides, pdfFile, organisation(walked separately here)
    expect(paths).not.toContain('id');
    expect(paths).not.toContain('status');
    expect(paths).not.toContain('slides');
    expect(paths).not.toContain('pdfFile');
    // arrays never emit indexed paths
    expect(paths.some((p) => p.startsWith('tags'))).toBe(false);
  });

  it('recurses into a nested object under a base prefix', () => {
    const paths = flattenVars(doc.organisation, 'org').map((v) => v.path);
    expect(paths).toEqual(['org.name', 'org.primary']);
  });

  it('carries a truncated sample value', () => {
    const entry = flattenVars({ title: 'x'.repeat(100) })[0]!;
    expect(entry.sample.length).toBe(60);
  });
});
