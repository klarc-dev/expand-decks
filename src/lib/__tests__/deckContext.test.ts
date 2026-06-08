import { describe, expect, it } from 'vitest';

import { deckContext } from '../deckContext';

describe('deckContext', () => {
  it('includes title, language and tags when present', () => {
    const ctx = deckContext({
      title: 'Mon deck',
      language: 'fr',
      tags: ['ip', 'webinar'],
    });
    expect(ctx).toContain('Titre : Mon deck');
    expect(ctx).toContain('Langue : fr');
    expect(ctx).toContain('Mots-clés : ip, webinar');
    expect(ctx.endsWith('---\n\n')).toBe(true);
  });

  it('surfaces an English language so the model is steered to English', () => {
    expect(deckContext({ title: 'X', language: 'en', tags: null })).toContain('Langue : en');
  });

  it('omits empty fields cleanly — no "undefined" leaks', () => {
    const ctx = deckContext({ title: '', language: 'fr', tags: [] });
    expect(ctx).not.toContain('Titre :');
    expect(ctx).not.toContain('Mots-clés');
    expect(ctx).not.toContain('undefined');
  });

  it('returns an empty string for an entirely empty deck (brief used as-is)', () => {
    expect(deckContext({ title: '', language: '' as 'fr', tags: null })).toBe('');
  });
});
