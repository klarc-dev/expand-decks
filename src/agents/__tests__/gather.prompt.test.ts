import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));
vi.mock('../agents/research', () => ({
  researchSources: vi.fn().mockResolvedValue({ notes: '', evidence: [] }),
}));

import { gather } from '../agents/gather';
import { generateStructured } from '../model';

const mockedGenerateStructured = vi.mocked(generateStructured);

beforeEach(() => mockedGenerateStructured.mockReset());

describe('gather prompt scope', () => {
  it('uses dossier extraction rules without slide layout or deck-composition instructions', async () => {
    mockedGenerateStructured.mockResolvedValue({
      coreIdea: 'Une idée',
      audience: 'Experts',
      soWhat: 'Utilité',
      keyPoints: ['Point'],
      data: [],
      sources: [],
    });

    await gather('Brief libre', undefined, 'en');

    const call = mockedGenerateStructured.mock.calls[0]![0];
    const instructions = call.instructions;
    expect(instructions).toContain('Tu extrais');
    expect(instructions).not.toContain('Layouts disponibles');
    expect(instructions).not.toContain('UNE FONCTION PAR DIAPOSITIVE');
    expect(instructions).not.toContain('CHARGE COGNITIVE');
    expect(instructions).not.toContain('Commence TOUJOURS');
    // The output language is carried by the request context, not concatenated
    // into the phase prompt: the localized agent adds the policy itself.
    expect(instructions).not.toContain('Required output language');
    expect(call.requestContext?.get('language')).toBe('en');
  });

  it('does not convert a brief or an unvisited domain into a bibliographic reference', async () => {
    mockedGenerateStructured.mockResolvedValue({
      coreIdea: 'Plateforme',
      audience: 'Laboratoires',
      soWhat: 'Partenaires',
      keyPoints: ['Annuaire', 'Requêtes', 'Messagerie'],
      data: [],
      sources: [],
      references: ['User-provided presentation brief', 'cosmetic-labs.com'],
    });
    const result = await gather('Présente cosmetic-labs.com et sa messagerie');
    expect(result.dossier.references).toEqual([]);
    expect(mockedGenerateStructured.mock.calls[0]![0].instructions).toContain(
      'mécanismes explicitement demandés',
    );
  });

  it('retains an explicitly supplied bibliographic reference', async () => {
    mockedGenerateStructured.mockResolvedValue({
      coreIdea: 'Idée',
      audience: 'Public',
      soWhat: 'Intérêt',
      keyPoints: ['Point'],
      data: [],
      sources: [],
      references: ['Author, Article (2024)'],
    });
    const result = await gather('Explique ce sujet. Source : Author, Article (2024)');
    expect(result.dossier.references).toEqual(['Author, Article (2024)']);
  });
});
