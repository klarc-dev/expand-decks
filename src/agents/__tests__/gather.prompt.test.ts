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

    const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
    expect(instructions).toContain('Tu extrais');
    expect(instructions).not.toContain('Layouts disponibles');
    expect(instructions).not.toContain('UNE FONCTION PAR DIAPOSITIVE');
    expect(instructions).not.toContain('CHARGE COGNITIVE');
    expect(instructions).not.toContain('Commence TOUJOURS');
    expect(instructions).toContain('Required output language: English');
  });
});
