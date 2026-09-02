import { describe, expect, it } from 'vitest';

import { parseAiSlide } from '../index';

describe('AI semantic layout contracts', () => {
  it.each([
    ['cardGrid', { title: 'Conditions cumulatives' }],
    ['stats', { title: 'Chiffres disponibles' }],
    ['quotes', { title: 'Positions citées' }],
    ['table', { title: 'Comparaison' }],
    ['timeline', { title: 'Processus' }],
  ])('rejects a title-only %s slide', (blockType, fields) => {
    expect(() => parseAiSlide({ blockType, ...fields })).toThrow();
  });

  it('rejects two-column slides without a right-hand comparison', () => {
    expect(() =>
      parseAiSlide({ blockType: 'twoCols', title: 'Deux régimes', intro: 'Comparer les règles' }),
    ).toThrow();
  });

  it('rejects whitespace-only titles', () => {
    expect(() => parseAiSlide({ blockType: 'statement', title: '   ' })).toThrow();
  });

  it('accepts concise claim headlines that are grammatically complete', () => {
    expect(
      parseAiSlide({
        blockType: 'statement',
        title: 'La mission effective détermine le régime applicable',
      }),
    ).toMatchObject({ title: 'La mission effective détermine le régime applicable' });
  });
});
