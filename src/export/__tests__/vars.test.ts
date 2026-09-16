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
    lastBuildToken: 'internal-token',
    documentTemplate: 'presentation',
    status: 'draft',
    tags: ['a', 'b'],
    slides: [{ blockType: 'cover' }],
    pdfFile: 99,
    organisation: {
      name: 'Klarc',
      website: 'https://klarc.example',
      contactEmail: 'hello@klarc.example',
      phone: '+33 1 23 45 67 89',
      bookingUrl: 'https://klarc.example/booking',
      linkedin: 'https://linkedin.com/company/klarc',
      primary: '#02585C',
      headingFont: 'Gilroy',
      createdAt: '2026-09-16T00:00:00.000Z',
      createdBy: 42,
    },
  };

  it('exposes only the presentation variables explicitly allowed for authors', () => {
    expect(flattenVars(doc).map((entry) => entry.path)).toEqual(['title', 'language']);
  });

  it('exposes only the public organisation contact variables', () => {
    expect(flattenVars(doc.organisation, 'org').map((entry) => entry.path)).toEqual([
      'org.name',
      'org.website',
      'org.bookingUrl',
    ]);
  });

  it('carries a truncated sample value', () => {
    const entry = flattenVars({ title: 'x'.repeat(100) })[0]!;
    expect(entry.sample.length).toBe(60);
  });
});
