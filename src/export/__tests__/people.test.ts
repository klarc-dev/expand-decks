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
  it('keeps equal padding on every side in each person-card variant', () => {
    for (const selector of [
      '.k-person-card',
      '.k-cardgrid-people .k-person-card',
      '.k-cardgrid-people--grid .k-person-card',
    ]) {
      expect(rule(selector)).toMatch(/padding: \d*\.?\d+rem;/);
    }
  });

  it('stretches the content column and anchors contact icons to its bottom', () => {
    expect(rule('.k-person-body')).toContain('display: flex');
    expect(rule('.k-person-body')).toContain('flex-direction: column');
    expect(rule('.k-person-body')).toContain('align-self: stretch');
    for (const selector of ['.k-person-contact', '.k-cardgrid-people--grid .k-person-contact']) {
      expect(rule(selector)).toContain('margin-top: auto');
      expect(rule(selector)).toMatch(/padding-top: [\d.]+rem/);
    }
  });

  it('emits one accessible icon-only Tabler link per authored channel', () => {
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
    for (const label of ['anne@example.com', '+33 6 12 34 56 78', 'LinkedIn', 'Profil Klarc']) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`title="${label}"`);
      expect(html).not.toContain(`<span>${label}</span>`);
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
    expect(personCard(person)).toContain('aria-label="Profil Klarc"');
    expect(personCard(person)).not.toContain('<span>Profil Klarc</span>');
    expect(userToPerson({ name: 'Anne', email: 'anne@example.com' })?.website).toBeUndefined();
    for (const website of ['', 'javascript:alert(1)', 'mailto:anne@example.com', '//example.com']) {
      expect(personCard({ initials: 'AM', name: 'Anne', website })).not.toContain(
        'k-person-contact',
      );
    }
  });
  it('links the name and photo to the authored public profile, never to the email', () => {
    const html = renderPeopleStrip(
      [
        {
          user: {
            name: 'Anne Martin',
            title: 'Conseil',
            email: 'anne@example.com',
            phone: '+33 6 12 34 56 78',
            linkedin: 'https://linkedin.com/in/anne',
            website: 'https://example.com/equipe/anne',
            avatar: { sizes: { thumbnail: { filename: 'anne.png' } } },
          },
        },
      ],
      'k-cover-people',
    );
    expect(html).toContain(
      '<a href="https://example.com/equipe/anne" aria-label="Profil public de Anne Martin"><img class="k-person-avatar" :src=\'"./media/anne.png"\' alt="" /></a>',
    );
    expect(html).toContain(
      '<div class="k-person-name"><a href="https://example.com/equipe/anne">Anne Martin</a></div>',
    );
    expect(html).toContain('alt=""');
    expect(html.match(/href="mailto:anne@example.com"/g)).toHaveLength(1);
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

  it('renders an escaped optional description below the job title', () => {
    const html = renderPeopleStrip(
      [
        {
          user: { name: 'Benjamin Visser', title: 'Avocat' },
          description: 'Fiscalité des entreprises & fiscalité de l’innovation',
        },
      ],
      'k-cardgrid-people--grid',
    );

    expect(html.indexOf('k-person-title')).toBeLessThan(html.indexOf('k-person-description'));
    expect(html).toContain('Fiscalité des entreprises &amp; fiscalité de l’innovation');
    expect(rule('.k-person-description')).toContain('display: none');
    expect(rule('.k-cardgrid-people--grid .k-person-description')).toContain('text-wrap: pretty');
    expect(rule('.k-cardgrid-people--grid .k-person-title')).toContain('margin-top: 0.12rem');
    expect(rule('.k-cardgrid-people--grid')).toContain('grid-auto-rows: minmax(0, 1fr)');
    expect(rule('.k-cardgrid-people--grid')).toContain('max-height: 100%');
    expect(rule('.k-cardgrid-people--grid .k-person-avatar')).toContain(
      'object-position: center 14%',
    );
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

  it('keeps contact icons visible on one row and makes keyboard focus visible', () => {
    expect(rule('.k-person-contact')).toContain('display: flex');
    expect(rule('.k-person-link')).toContain('width: 1.9rem');
    expect(rule('.k-person-link')).toContain('border-radius: 999px');
    expect(rule('.k-cardgrid-people--grid .k-person-contact')).toContain('flex-wrap: nowrap');
    expect(rule('.k-cardgrid-people--grid .k-person-contact')).toContain('flex-direction: row');
    expect(rule('.slidev-layout .k-person-card a')).toContain(
      'text-decoration-color: currentColor',
    );
    expect(rule('.slidev-layout a:focus-visible')).toContain('outline: 2px solid currentColor');
  });
});
