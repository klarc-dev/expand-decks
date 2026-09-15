import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { personCard, renderPeopleStrip, userToPerson } from '../people';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const rule = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escapedSelector} \\{([^}]*)\\}`, 'm'));
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
};

describe('shared person cards', () => {
  it('emits one inline Tabler outline SVG per authored channel, with readable link names', () => {
    const html = personCard({
      initials: 'AM',
      name: 'Anne Martin',
      email: 'anne@example.com',
      phone: '+33 6 12 34 56 78',
      linkedin: 'https://linkedin.com/in/anne',
      website: 'https://example.com/about?a=1&b=2',
    });
    for (const icon of ['mail', 'phone', 'brand-linkedin', 'world']) {
      expect(html).toContain(`tabler-icon-${icon}`);
    }
    expect(html.match(/<svg /g)).toHaveLength(4);
    expect(html.match(/stroke="currentColor"/g)).toHaveLength(4);
    expect(html.match(/stroke-width="1.75"/g)).toHaveLength(4);
    expect(html.match(/aria-hidden="true" focusable="false"/g)).toHaveLength(4);
    for (const text of ['anne@example.com', '+33 6 12 34 56 78', 'LinkedIn', 'Profil Klarc']) {
      expect(html).toContain(`<span>${text}</span></a>`);
    }
    expect(html).toContain('href="https://example.com/about?a=1&amp;b=2"');
    expect(html).not.toMatch(/<use|<script|<image/);
    expect(rule('.k-person-link > svg')).toContain('flex: none');
    expect(rule('.k-person-link > svg')).toContain('color: inherit');
  });

  it('keeps authored profile links and never infers them from organisation or email', () => {
    const person = userToPerson({
      name: 'Anne',
      email: 'anne@example.com',
      website: 'https://example.com/equipe/anne',
      linkedin: 'https://linkedin.com/in/anne',
      organisation: { website: 'https://example.com' },
    })!;
    expect(person.website).toBe('https://example.com/equipe/anne');
    expect(personCard(person)).toContain('<span>Profil Klarc</span></a>');
    expect(userToPerson({ name: 'Anne', email: 'anne@example.com' })?.website).toBeUndefined();
    for (const website of ['', 'javascript:alert(1)', 'mailto:anne@example.com', '//example.com']) {
      expect(personCard({ initials: 'AM', name: 'Anne', website })).not.toContain(
        'k-person-contact',
      );
    }
  });
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
    expect(rule('.slidev-layout a:focus-visible')).toContain('outline: 2px solid currentColor');
  });
});
