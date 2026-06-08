import { describe, expect, it } from 'vitest';

import { buildSlidesMd } from '../buildSlidesMd';
import { md, yamlScalar, yamlQuoted } from '../utils';

const HEADMATTER = 'theme: default';

describe('yamlScalar() — frontmatter injection defense', () => {
  it('leaves safe layout/class tokens unquoted', () => {
    expect(yamlScalar('cover')).toBe('cover');
    expect(yamlScalar('image-right')).toBe('image-right');
    expect(yamlScalar('relative k-dark')).toBe('relative k-dark');
    expect(yamlScalar('/media/photo.jpg')).toBe('/media/photo.jpg');
  });

  it('quotes and escapes a value that would inject a frontmatter key', () => {
    const out = yamlScalar('x\nlayout: evil');
    expect(out).toBe('"x\\nlayout: evil"');
    expect(out).not.toMatch(/\n/);
  });

  it('escapes embedded double quotes', () => {
    expect(yamlScalar('a"b')).toBe('"a\\"b"');
  });

  it('strips control characters', () => {
    expect(yamlScalar('a\x07b\nc')).toBe('"ab\\nc"');
  });

  it('quotes values containing a colon (YAML key indicator)', () => {
    expect(yamlScalar('https://example.com')).toBe('"https://example.com"');
  });
});

describe('yamlQuoted() — always-quoted title', () => {
  it('always wraps in quotes even for plain values', () => {
    expect(yamlQuoted('Test Deck')).toBe('"Test Deck"');
  });

  it('neutralizes a malicious title', () => {
    const out = yamlQuoted('Bad"\nlayout: center');
    expect(out).toBe('"Bad\\"\\nlayout: center"');
    expect(out).not.toMatch(/\n/);
  });
});

describe('buildSlidesMd() — title cannot break headmatter', () => {
  it('keeps a single frontmatter block when the title contains quotes/newlines', () => {
    const result = buildSlidesMd(
      { title: 'Evil"\nlayout: hijack\nfoo: bar', slides: [{ blockType: 'cover', title: 'Hi' } as never] },
      { headmatter: HEADMATTER },
    );
    // The injected keys must never appear at the start of a real frontmatter
    // line — only neutralized inside the quoted, escaped title scalar.
    expect(result).not.toMatch(/^layout: hijack$/m);
    expect(result).not.toMatch(/^foo: bar$/m);
    expect(result).toContain('title: "Evil\\"\\nlayout: hijack\\nfoo: bar"');
  });
});

describe('md() — link href XSS defense', () => {
  it('never emits a javascript: anchor', () => {
    const out = md('[click](javascript:alert(1))');
    expect(out).not.toContain('<a');
    expect(out).not.toContain('javascript:');
  });

  it('never emits an anchor for a javascript: scheme behind a leading newline', () => {
    const out = md('[x](\njavascript:alert(1))');
    expect(out).not.toContain('href="javascript:');
  });

  it('never emits a data: URI anchor', () => {
    const out = md('[y](data:text/html,x)');
    expect(out).not.toContain('<a');
    expect(out).not.toContain('data:');
  });

  it('allows https links', () => {
    expect(md('[ok](https://example.com)')).toBe('<a href="https://example.com">ok</a>');
  });

  it('allows mailto links', () => {
    expect(md('[mail](mailto:a@b.com)')).toBe('<a href="mailto:a@b.com">mail</a>');
  });

  it('allows relative and anchor links', () => {
    expect(md('[rel](/deck/1)')).toBe('<a href="/deck/1">rel</a>');
    expect(md('[anchor](#section)')).toBe('<a href="#section">anchor</a>');
  });
});
