import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));

import { groundDossier } from '../dossierGrounding';
import { generateStructured } from '../model';
import type { DeckDossier } from '../schemas';

const mockedGenerateStructured = vi.mocked(generateStructured);

const dossier: DeckDossier = {
  coreIdea: 'A supported idea.',
  audience: 'Executives',
  soWhat: 'A supported consequence.',
  keyPoints: ['Supported point', 'Invented doctrine'],
  data: ['Invented statistic'],
  sources: [],
  rawBrief: 'Explain the supported idea and supported point.',
  language: 'en',
};

beforeEach(() => mockedGenerateStructured.mockReset());

describe('groundDossier', () => {
  it('returns the dossier unchanged when every claim is supported', async () => {
    mockedGenerateStructured.mockResolvedValueOnce({
      supported: true,
      unsupportedClaims: [],
      reason: 'All claims follow from the brief.',
    });

    await expect(groundDossier(dossier, [])).resolves.toBe(dossier);
  });

  it('rewrites an unsupported dossier from the brief and evidence only', async () => {
    const repaired = {
      ...dossier,
      keyPoints: ['Supported point'],
      data: [],
    };
    mockedGenerateStructured
      .mockResolvedValueOnce({
        supported: false,
        unsupportedClaims: ['Invented doctrine', 'Invented statistic'],
        reason: 'The dossier expands beyond the brief.',
      })
      .mockResolvedValueOnce(repaired);

    await expect(groundDossier(dossier, [])).resolves.toEqual(repaired);

    const repairCall = mockedGenerateStructured.mock.calls[1]![0];
    expect(repairCall.prompt).toContain('Invented doctrine');
    expect(repairCall.prompt).toContain(dossier.rawBrief);
    expect(repairCall.instructions).toContain('fait propre à l’auteur');
    expect(repairCall.instructions).toContain('connaissances générales établies');
  });

  it('treats established explanatory knowledge as authorized while protecting case-specific facts', async () => {
    mockedGenerateStructured.mockResolvedValueOnce({
      supported: true,
      unsupportedClaims: [],
      reason: 'The dossier uses ordinary domain knowledge to answer the requested explanation.',
    });

    await groundDossier(dossier, []);

    const auditCall = mockedGenerateStructured.mock.calls[0]![0];
    expect(auditCall.instructions).toContain('connaissances générales établies');
    expect(auditCall.instructions).toContain('faits propres à l’auteur');
    expect(auditCall.instructions).toContain('ne constitue pas une invention');
    expect(auditCall.instructions).toContain("L'absence de précision doit rester silencieuse");
  });

  it('uses additional authorized facts when the caller supplies them', async () => {
    mockedGenerateStructured.mockResolvedValueOnce({
      supported: true,
      unsupportedClaims: [],
      reason: 'Supported by the evaluation facts.',
    });

    await groundDossier(dossier, [], undefined, ['A practical checklist may cover caveats.']);

    expect(mockedGenerateStructured.mock.calls[0]![0].prompt).toContain(
      'A practical checklist may cover caveats.',
    );
  });
});
