import { describe, expect, it } from 'vitest';

import { languageInstruction, resolveTargetLanguage } from '../language';

describe('resolveTargetLanguage', () => {
  it('honours an explicit target language regardless of the brief language', () => {
    expect(resolveTargetLanguage('en', 'Crée une formation en français')).toBe('en');
    expect(resolveTargetLanguage('fr', 'Create an English training deck')).toBe('fr');
  });

  it('detects common French signals once when no target is supplied', () => {
    expect(
      resolveTargetLanguage(undefined, 'Formation pour les juristes avec une étude de cas'),
    ).toBe('fr');
  });

  it('defaults ambiguous or English briefs to English', () => {
    expect(resolveTargetLanguage(undefined, 'Expert training for corporate lawyers')).toBe('en');
    expect(resolveTargetLanguage(undefined, 'R&D')).toBe('en');
  });
});

describe('languageInstruction', () => {
  it('requires idiomatic French and prevents source-language leakage', () => {
    const prompt = languageInstruction('fr');
    expect(prompt).toContain('Langue de sortie imposée : français');
    expect(prompt).toContain('sources peuvent être multilingues');
    expect(prompt).toContain('Ne mélange pas les langues');
  });

  it('requires idiomatic English and preserves exact technical material', () => {
    const prompt = languageInstruction('en');
    expect(prompt).toContain('Required output language: English');
    expect(prompt).toContain('multilingual');
    expect(prompt).toContain('Do not mix languages');
    expect(prompt).toContain('exact quotations');
  });
});
