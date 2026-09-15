import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderPeopleStrip, userToPerson } from '../people';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const rule = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escapedSelector} \\{([^}]*)\\}`, 'm'));
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
};

describe('shared person cards', () => {
  it('retains the photo and independently actionable name, email, phone and profile', () => {
    const html = renderPeopleStrip(
      [
        {
          user: {
            name: 'Anne Martin',
            title: 'Conseil',
            email: 'anne@example.com',
            phone: '+33 6 12 34 56 78',
            linkedin: 'https://linkedin.com/in/anne',
            avatar: { sizes: { thumbnail: { filename: 'anne.png' } } },
          },
        },
      ],
      'k-cover-people',
    );
    expect(html).toContain(':src=\'"./media/anne.png"\'');
    expect(html).toContain('alt=""');
    expect(html.match(/href="mailto:anne@example.com"/g)).toHaveLength(2);
    expect(html).toContain('href="tel:+33612345678"');
    expect(html).toContain('href="https://linkedin.com/in/anne"');
    expect(html).not.toContain('k-person-initials');
  });

  it('keeps optional avatar, title and contact states quiet and meaningful', () => {
    const html = renderPeopleStrip([{ user: { name: 'Anne Martin' } }], 'k-cardgrid-people');
    expect(html).toContain('aria-hidden="true">AM</span>');
    expect(html).not.toContain('k-person-contact');
    expect(html).not.toContain('k-person-title');
    expect(html).not.toContain('<a ');
    expect(renderPeopleStrip([{ user: 42 }, null], 'k-cover-people')).toBe('');
    expect(userToPerson({ email: 'anne@example.com' })?.name).toBe('anne');
  });

  it('escapes visible content and excludes unsafe contact URLs', () => {
    const html = renderPeopleStrip(
      [
        {
          user: {
            name: '<Anne & Martin>',
            title: '<Conseil>',
            phone: 'à définir',
            linkedin: 'javascript:alert(1)',
          },
        },
      ],
      'k-cardgrid-people',
    );
    expect(html).toContain('&lt;Anne &amp; Martin&gt;');
    expect(html).toContain('&lt;Conseil&gt;');
    expect(html).not.toContain('k-person-contact');
  });

  it('uses inherited initials rather than nested colored fills in both themes', () => {
    for (const selector of ['.k-person-initials', '.k-dark .k-person-initials']) {
      expect(rule(selector)).toContain('background: transparent');
      expect(rule(selector)).toContain('color: inherit');
      expect(rule(selector)).not.toContain('--k-rose');
    }
  });

  it('wraps contacts instead of hiding them and makes keyboard focus visible', () => {
    expect(rule('.k-person-contact')).toContain('flex-wrap: wrap');
    expect(rule('.k-person-link')).toContain('overflow-wrap: anywhere');
    expect(rule('.k-person-link')).not.toContain('overflow: hidden');
    expect(rule('.k-cardgrid-people--grid .k-person-link')).toContain('white-space: normal');
    expect(rule('.slidev-layout .k-person-card a')).toContain(
      'text-decoration-color: currentColor',
    );
    expect(rule('.slidev-layout .k-person-card a:focus-visible')).toContain(
      'outline: 2px solid currentColor',
    );
  });
});
