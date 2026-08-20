import { describe, expect, it } from 'vitest';
import { STRUCTURE_SYSTEM_PROMPT, buildWriterLayoutPrompt } from '../prompts/catalog';
import { RUBRIC_PROMPT } from '../prompts/rubric';

describe('structure prompt catalogue', () => {
  it('is a non-empty string naming AI-draftable blocks', () => {
    expect(typeof STRUCTURE_SYSTEM_PROMPT).toBe('string');
    expect(STRUCTURE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    for (const name of [
      'cover',
      'agenda',
      'section',
      'statement',
      'twoCols',
      'timeline',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
      'table',
      'mermaid',
    ]) {
      expect(STRUCTURE_SYSTEM_PROMPT).toContain(name);
    }
  });

  it('selects layouts from the information relationship rather than decorative variety', () => {
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('relation logique de l’information');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('agenda : seulement si');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('statement : une règle');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('twoCols : deux catégories');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('cardGrid : ensemble de critères');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('stats : chiffres');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('quotes : citation exacte');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('table : comparaison');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('timeline : étapes ordonnées');
    expect(STRUCTURE_SYSTEM_PROMPT).toContain('mermaid : relations');
    expect(STRUCTURE_SYSTEM_PROMPT).not.toContain('Varie les layouts pour structurer');
  });

  it('builds writer guidance for only the selected layout and excludes deck-level rules', () => {
    const prompt = buildWriterLayoutPrompt('statement');

    expect(prompt).toContain('**statement**');
    expect(prompt).not.toContain('**cover**');
    expect(prompt).not.toContain('**table**');
    expect(prompt).not.toContain('Commence TOUJOURS');
    expect(prompt).not.toContain('Termine TOUJOURS');
    expect(prompt).not.toContain('nombre de diapositives');
  });

  it('does not advertise non-AI fields in writer layout guidance', () => {
    expect(buildWriterLayoutPrompt('cover')).not.toContain('intervenants');
  });
});

describe('RUBRIC_PROMPT', () => {
  it('enforces expert training craft without prescribing the subject matter', () => {
    for (const principle of [
      "objectif d'apprentissage",
      'une fonction pédagogique',
      'règle, conditions, exceptions, conséquences',
      'mise en application',
      'niveau expert',
      'statut épistémique',
      'corrélation en causalité',
    ]) {
      expect(RUBRIC_PROMPT).toContain(principle);
    }

    expect(RUBRIC_PROMPT).toContain('Le brief et les sources déterminent le fond');
  });

  it('requires message titles and evidence-backed examples while forbidding invention', () => {
    expect(RUBRIC_PROMPT.toLowerCase()).toContain('titre-message');
    expect(RUBRIC_PROMPT).toContain('exemple concret');
    expect(RUBRIC_PROMPT.toLowerCase()).toContain("n'invente jamais");
  });
});
