import { describe, expect, it } from 'vitest';

import { assessSlideLayoutCompatibility } from '../slideLayoutCompatibility';

describe('assessSlideLayoutCompatibility()', () => {
  it('classifies every allowed layout and keeps the current layout compatible', () => {
    const results = assessSlideLayoutCompatibility(
      {
        blockType: 'statement',
        eyebrow: 'Constat',
        title: 'La preuve doit rester lisible',
        body: { root: { children: [{ type: 'paragraph' }] } },
        footer: { root: { children: [{ type: 'paragraph' }] } },
        footnotes: [{ text: 'Source primaire' }],
      },
      ['cover', 'statement', 'twoCols', 'cardGrid', 'table', 'markdown'],
    );

    expect(results.map((result) => result.layout)).toEqual([
      'cover',
      'statement',
      'twoCols',
      'cardGrid',
      'table',
      'markdown',
    ]);
    expect(results.find((result) => result.layout === 'statement')).toMatchObject({
      classification: 'compatible',
      issues: [],
    });
    expect(results.find((result) => result.layout === 'twoCols')).toMatchObject({
      classification: 'adjustments',
      mappedFields: [
        { from: 'body', role: 'prose.support', to: 'intro' },
        { from: 'footer', role: 'takeaway', to: 'leftFooter' },
      ],
      unsupportedFields: [],
    });
    expect(results.find((result) => result.layout === 'cover')).toMatchObject({
      classification: 'lossy',
      unsupportedFields: ['footer', 'footnotes'],
    });
    expect(results.find((result) => result.layout === 'table')).toMatchObject({
      classification: 'unavailable',
    });
    expect(results.find((result) => result.layout === 'markdown')).toMatchObject({
      classification: 'unavailable',
    });
  });

  it('reports capacity problems independently from unsupported fields', () => {
    const results = assessSlideLayoutCompatibility(
      {
        blockType: 'cardGrid',
        title: 'Huit éléments',
        cards: Array.from({ length: 8 }, (_, index) => ({ title: `Carte ${index + 1}` })),
      },
      ['cardGrid', 'twoCols'],
    );

    expect(results.find((result) => result.layout === 'cardGrid')).toMatchObject({
      classification: 'compatible',
    });
    const twoCols = results.find((result) => result.layout === 'twoCols');
    expect(twoCols).toMatchObject({ classification: 'lossy' });
    expect(twoCols?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'capacity',
          field: 'cards',
        }),
      ]),
    );
  });

  it('does not treat empty optional fields as information loss', () => {
    const results = assessSlideLayoutCompatibility(
      { blockType: 'statement', title: 'Message', body: null, footer: null, footnotes: [] },
      ['cover'],
    );

    expect(results[0]).toMatchObject({
      classification: 'compatible',
      unsupportedFields: [],
    });
  });

  it('rejects unknown source and target layouts explicitly', () => {
    expect(() =>
      assessSlideLayoutCompatibility({ blockType: 'unknown', title: 'Message' }, ['statement']),
    ).toThrow('Layout source inconnu');
    expect(() =>
      assessSlideLayoutCompatibility({ blockType: 'statement', title: 'Message' }, ['unknown']),
    ).toThrow('Layout cible inconnu');
  });
});
