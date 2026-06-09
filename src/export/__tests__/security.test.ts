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

describe('buildSlidesMd() — composed deck is injection-free across all block types', () => {
  const INJECT = 'pwn"\nlayout: hijack\nevilKey: stolen';
  const XSS_LINK = '[x](javascript:alert(1))';
  const DATA_LINK = '[y](data:text/html,<script>1</script>)';

  // Feed YAML-injection + XSS payloads through every text surface of every
  // block type, then assert the full assembled deck cannot be hijacked.
  const slides = [
    { blockType: 'cover', title: INJECT, eyebrow: XSS_LINK, subtitle: DATA_LINK },
    { blockType: 'statement', title: INJECT, body: `${XSS_LINK} ${DATA_LINK}` },
    { blockType: 'section', title: INJECT, number: '01', surface: 'dark' },
    { blockType: 'cardGrid', title: INJECT, columns: '4', cards: [{ number: '01', title: XSS_LINK, description: DATA_LINK }] },
    { blockType: 'twoCols', title: INJECT, intro: XSS_LINK, rightCards: [{ title: INJECT, description: DATA_LINK }] },
    { blockType: 'stats', title: INJECT, stats: [{ value: XSS_LINK, label: INJECT }] },
    { blockType: 'quotes', title: INJECT, quotes: [{ quote: XSS_LINK, authorName: INJECT, authorRole: DATA_LINK }] },
    { blockType: 'cta', title: INJECT, subtitle: XSS_LINK, primaryAction: DATA_LINK, footerNote: INJECT },
  ];

  const result = buildSlidesMd({ title: INJECT, slides: slides as never }, { headmatter: HEADMATTER });

  // Extract only the YAML frontmatter blocks (between --- fences). An injected
  // key is exploitable only if it lands HERE; the same text appearing inside an
  // HTML <h1> body is harmless escaped content, not a parsed directive.
  const frontmatterBlocks: string[] = [];
  {
    const lines = result.split('\n');
    let inFm = false;
    let buf: string[] = [];
    for (const line of lines) {
      if (line === '---') {
        if (inFm) { frontmatterBlocks.push(buf.join('\n')); buf = []; }
        inFm = !inFm;
        continue;
      }
      if (inFm) buf.push(line);
    }
  }
  const allFrontmatter = frontmatterBlocks.join('\n');

  it('emits no injected key inside any frontmatter block', () => {
    expect(allFrontmatter).not.toMatch(/^layout: hijack$/m);
    expect(allFrontmatter).not.toMatch(/^evilKey: stolen$/m);
  });

  it('emits no dangerous-scheme anchor anywhere in the deck', () => {
    expect(result).not.toContain('href="javascript:');
    expect(result).not.toContain('href="data:');
    expect(result).not.toContain('href="vbscript:');
  });

  it('still produces a parseable multi-slide deck (payloads did not break rendering)', () => {
    const fences = result.match(/^---\s*$/gm) ?? [];
    expect(fences.length).toBeGreaterThan(slides.length);
  });
});
