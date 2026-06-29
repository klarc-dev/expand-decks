import { describe, expect, it } from 'vitest';

import { findInformationalStyleViolations, StylePolicyError } from '../prompts/style';

describe('informational style policy', () => {
  it('accepts factual informational prose', () => {
    expect(
      findInformationalStyleViolations({
        title: 'Le processus comporte trois étapes',
        cards: [
          {
            title: 'Contrôle initial',
            description: 'Deux documents sont vérifiés avant signature.',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('detects promotional and superlative terms in nested slide content', () => {
    const violations = findInformationalStyleViolations({
      slides: [
        {
          title: 'Une approche révolutionnaire',
          cards: [{ description: 'Boostez vos résultats avec une solution world-class !' }],
        },
      ],
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('slides.0.title'),
        expect.stringContaining('revolutionnaire'),
        expect.stringContaining('slides.0.cards.0.description'),
        expect.stringContaining('boost'),
        expect.stringContaining('world class'),
        expect.stringContaining("point d'exclamation"),
      ]),
    );
  });

  it('matches accents and case insensitively', () => {
    expect(findInformationalStyleViolations({ title: 'Une offre RÉVOLUTIONNAIRE' })).toEqual([
      expect.stringContaining('revolutionnaire'),
    ]);
  });

  it('deduplicates repeated matches on the same path and term', () => {
    expect(
      findInformationalStyleViolations({ title: 'Incroyable, vraiment incroyable' }).filter((v) =>
        v.includes('incroyable'),
      ),
    ).toHaveLength(1);
  });

  it('ignores non-prose source/code fields', () => {
    expect(
      findInformationalStyleViolations({
        source: 'flowchart TD\n  A[Boost] --> B[World-class]',
        url: 'https://example.com/revolutionary',
        title: 'Flux de décision',
      }),
    ).toEqual([]);
  });

  it('does not match banned terms inside longer words', () => {
    expect(findInformationalStyleViolations({ title: 'Le leadership est documenté' })).toEqual([]);
  });

  it('stores violations on StylePolicyError', () => {
    const error = new StylePolicyError(["title : point d'exclamation"]);
    expect(error.name).toBe('StylePolicyError');
    expect(error.violations).toEqual(["title : point d'exclamation"]);
  });
});
