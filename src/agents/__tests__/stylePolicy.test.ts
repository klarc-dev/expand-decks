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

  it('rejects empty AI filler and metadiscourse in nested slide content', () => {
    const violations = findInformationalStyleViolations({
      title: 'Une analyse claire et complète',
      body: 'Il est important de noter que cette approche robuste permet de sécuriser efficacement le dispositif.',
      cards: [
        { description: 'Cette démarche essentielle offre une vision globale et pertinente.' },
      ],
    });

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/title.*claire et complete/),
        expect.stringMatching(/body.*important de noter/),
        expect.stringMatching(/body.*approche robuste/),
        expect.stringMatching(/cards\.0\.description.*demarche essentielle/),
        expect.stringMatching(/cards\.0\.description.*vision globale/),
      ]),
    );
  });

  it('accepts precise legal conditions, consequences and source references', () => {
    expect(
      findInformationalStyleViolations({
        title: 'Quatre conditions cumulatives pour le logiciel du stagiaire',
        body: 'La dévolution suppose une mission ou des instructions, une contrepartie, l’autorité d’un responsable et l’absence de stipulation contraire.',
        footnotes: [{ text: 'CPI, art. L. 113-9-1' }],
      }),
    ).toEqual([]);
  });

  it('stores violations on StylePolicyError', () => {
    const error = new StylePolicyError(["title : point d'exclamation"]);
    expect(error.name).toBe('StylePolicyError');
    expect(error.violations).toEqual(["title : point d'exclamation"]);
  });
});
