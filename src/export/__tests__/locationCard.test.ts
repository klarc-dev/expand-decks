import { describe, expect, it } from 'vitest';
import { renderCta } from '../blocks/cta';
import { locationCard, locationCardsFromNote } from '../utils';
import { richTextToHTML } from '../richtext';
import type { RichText } from '../richtext';

const text = (value: string, format = 0) => ({
  type: 'text',
  text: value,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
});
const link = (label: string, url: string) => ({
  type: 'link',
  fields: { linkType: 'custom', url },
  version: 3,
  children: [text(label)],
});
const paragraph = (children: unknown[]) => ({
  type: 'paragraph',
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
  textFormat: 0,
  children,
});
const state = (children: unknown[]) =>
  ({
    root: { type: 'root', direction: 'ltr', format: '', indent: 0, version: 1, children },
  }) as RichText;
// Actual office facts from scripts/seed-klarc-prospects.ts; no database writes.
const note = state([
  paragraph([
    text('Toulouse', 1),
    text(' · 15 rue d’Alsace-Lorraine, 31000 · '),
    link('+33 (0)5 61 38 53 52', 'tel:+33561385352'),
    text(' · '),
    link('toulouse@klarc.com', 'mailto:toulouse@klarc.com'),
  ]),
  paragraph([
    text('Lyon', 1),
    text(' · 3 rue de Genève, 69006 · '),
    link('+33 (0)5 25 63 09 36', 'tel:+33525630936'),
    text(' · '),
    link('lyon@klarc.com', 'mailto:lyon@klarc.com'),
  ]),
]);

describe('location card', () => {
  it('renders semantic escaped names and multiline addresses with a named directions anchor', () => {
    const html = locationCard({
      name: 'Office & <Team>',
      address: '15 Main Street\nCity',
      directionsUrl: 'https://maps.example/?a=1&b=2',
    });
    expect(html).toContain('<h3>Office &amp; &lt;Team&gt;</h3>');
    expect(html).toContain('15 Main Street<br>City</address>');
    expect(html).toContain('aria-label="Itinéraire · Office &amp; &lt;Team&gt;"');
    expect(html).toContain('href="https://maps.example/?a=1&amp;b=2"');
    expect(html).toContain('aria-hidden="true"');
  });
  it('does not invent a target, render unsafe links, or render an empty address', () => {
    for (const directionsUrl of [undefined, '#', 'javascript:alert(1)']) {
      expect(locationCard({ name: 'Office', address: 'Address', directionsUrl })).not.toContain(
        '<a ',
      );
    }
    expect(locationCard({ name: 'Office', address: ' ' })).toBe('');
  });
  it('localizes the action in English', () => {
    expect(
      locationCard({ name: 'Office', address: 'Address', language: 'en', directionsUrl: '/map' }),
    ).toContain('>Directions<svg');
  });
  it('upgrades real sanitized Lexical contact rows and preserves all original contacts', () => {
    const html = locationCardsFromNote(richTextToHTML(note));
    expect(html).not.toBeNull();
    expect(html?.match(/class="k-location-card"/g)).toHaveLength(2);
    for (const contact of [
      'tel:+33561385352',
      'tel:+33525630936',
      'mailto:toulouse@klarc.com',
      'mailto:lyon@klarc.com',
    ])
      expect(html).toContain(`href="${contact}"`);
    expect(html).toContain(encodeURIComponent('15 rue d’Alsace-Lorraine, 31000, Toulouse'));
  });
  it('leaves generic notes, mixed content and incomplete rows alone', () => {
    for (const html of [
      '',
      '<p>Merci</p>',
      '<p><strong>Deadline</strong> · 2026 · review</p>',
      `${richTextToHTML(note)}<p>Extra note</p>`,
    ])
      expect(locationCardsFromNote(html)).toBeNull();
  });
  it('uses the shared card in the actual CTA renderer on both tones', () => {
    for (const surface of ['light', 'dark'] as const) {
      const result = renderCta(
        {
          blockType: 'cta',
          title: 'Parlons de votre situation',
          footerNote: note,
          primaryAction: 'Prendre rendez-vous',
          primaryActionUrl: 'https://cal.klarc.com/team/meeting?user=team&duration=30',
        },
        { surface },
      );
      expect(result).toContain('k-location-grid');
      expect(result).toContain('k-cta-frame--locations');
      expect(result).toContain('k-cta-invitation');
      expect(result).toContain('</a><br><a href="mailto:');
      expect(result).toContain('Prendre rendez-vous');
      expect(result).toContain('maps/dir/?api=1&amp;destination=');
      expect(result).not.toContain('k-cta-caption');
    }
  });
  it('retains the original CTA caption path for other rich notes', () => {
    const result = renderCta({
      blockType: 'cta',
      title: 'Merci',
      footerNote: state([paragraph([text('À bientôt')])]),
    });
    expect(result).toContain('k-cta-caption');
    expect(result).toContain('À bientôt');
    expect(result).not.toContain('k-location-grid');
  });
});
