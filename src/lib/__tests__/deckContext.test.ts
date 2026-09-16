import { describe, expect, it } from 'vitest';

import { deckContext } from '../deckContext';

describe('deckContext', () => {
  it('includes title and language when present', () => {
    const ctx = deckContext({
      title: 'Mon deck',
      language: 'fr',
    });
    expect(ctx).toContain('Titre : Mon deck');
    expect(ctx).toContain('Langue : fr');
    expect(ctx.endsWith('---\n\n')).toBe(true);
  });

  it('surfaces an English language so the model is steered to English', () => {
    expect(deckContext({ title: 'X', language: 'en' })).toContain('Langue : en');
  });

  it('omits empty fields cleanly — no "undefined" leaks', () => {
    const ctx = deckContext({ title: '', language: 'fr' });
    expect(ctx).not.toContain('Titre :');
    expect(ctx).not.toContain('Mots-clés');
    expect(ctx).not.toContain('undefined');
  });

  it('returns an empty string for an entirely empty deck (brief used as-is)', () => {
    expect(deckContext({ title: '', language: '' as 'fr' })).toBe('');
  });

  it('lists the populated organisation contact details as the only linkable URLs', () => {
    const ctx = deckContext({
      title: 'Deck',
      language: 'fr',
      organisation: {
        name: 'Klarc',
        website: 'https://klarc.com',
        bookingUrl: 'https://cal.klarc.com/team',
      },
    });
    expect(ctx).toContain(
      'Coordonnées de l’organisation (Klarc), seules URL autorisées dans les liens :',
    );
    expect(ctx).toContain('Site web : https://klarc.com');
    expect(ctx).toContain('Prise de rendez-vous : https://cal.klarc.com/team');
  });

  it('ignores an unpopulated organisation id and an organisation without contacts', () => {
    expect(deckContext({ title: 'Deck', language: 'fr', organisation: 3 })).not.toContain(
      'Coordonnées',
    );
    expect(
      deckContext({ title: 'Deck', language: 'fr', organisation: { name: 'Klarc' } }),
    ).not.toContain('Coordonnées');
  });
});
