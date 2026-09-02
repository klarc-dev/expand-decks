import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));

import { generateStructured } from '../model';
import { structure } from '../agents/structure';
import type { DeckDossier } from '../schemas';
import type { DeckLanguage } from '../language';

const mockedGenerateStructured = vi.mocked(generateStructured);

beforeEach(() => mockedGenerateStructured.mockReset());

const baseDossier = (rawBrief: string, language: DeckLanguage = 'fr'): DeckDossier => ({
  coreIdea: 'x',
  audience: 'y',
  soWhat: 'z',
  keyPoints: ['a', 'b'],
  data: [],
  sources: [],
  rawBrief,
  language,
});

describe('structure() explicit-brief fast-path', () => {
  it('returns exactly N stubs without calling the LLM for an S1—…Sn— brief', async () => {
    const brief = [
      'S1 — Couverture',
      'intro',
      'S2 — Le probleme',
      'corps',
      'S3 — Appel a action',
      'cta',
    ].join('\n');
    const stubs = await structure(baseDossier(brief));
    expect(stubs).toHaveLength(3);
    expect(stubs[0]!.blockType).toBe('cover');
    expect(stubs[2]!.blockType).toBe('cta');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('enforces the canonical outline schema on deterministic slide briefs', async () => {
    const brief = [
      'S1 — **Couverture**',
      'intro',
      'S2 — Le problème',
      'corps',
      'S3 — Appel à action',
      'cta',
    ].join('\n');

    await expect(structure(baseDossier(brief))).rejects.toThrow('texte brut');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('falls through to the LLM when the brief is not slide-by-slide', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 't', intent: 'i' },
        { blockType: 'cta', title: 't2', intent: 'i2' },
      ],
    });
    const stubs = await structure(baseDossier('un brief libre sans marqueurs S1'));
    expect(generateStructured).toHaveBeenCalled();
    expect(Array.isArray(stubs)).toBe(true);
  });

  it('uses deck-level structure rules and the complete layout catalogue', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 'A', intent: 'i' },
        { blockType: 'statement', title: 'B', intent: 'i2' },
        { blockType: 'cta', title: 'C', intent: 'i3' },
      ],
    });

    await structure(baseDossier('brief libre'));

    const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
    expect(instructions).toContain('Commence TOUJOURS par un bloc "cover"');
    expect(instructions).toContain('**statement**');
    expect(instructions).toContain('**table**');
    expect(instructions).toContain('Langue de sortie imposée : français');
  });

  it('does not expose dossier sources in the structure prompt while keeping grounded data', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 'A', intent: 'i' },
        { blockType: 'statement', title: 'B', intent: 'i2' },
        { blockType: 'cta', title: 'C', intent: 'i3' },
      ],
    });

    const stubs = await structure({
      ...baseDossier('brief libre'),
      data: ['42% adoption in 2026'],
      sources: ['Private KB — internal memo'],
    });

    const prompt = mockedGenerateStructured.mock.calls[0]![0].prompt;
    const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
    expect(stubs).toHaveLength(3);
    expect(prompt).toContain('42% adoption in 2026');
    expect(prompt).not.toContain('SOURCES :');
    expect(prompt).not.toContain('Private KB — internal memo');
    expect(instructions).toContain('ne planifie jamais une diapositive ou une intention "Sources"');
  });
});

// ---------------------------------------------------------------------------
// Parser edge cases — cover/cta endpoints, title extraction, blockType routing
// These replace the parser coverage previously in draftPresentation.test.ts.
// All drive structure() with a crafted rawBrief; the LLM is never called.
// ---------------------------------------------------------------------------

describe('structure() parser — cover/cta endpoints', () => {
  it('S1 always maps to cover regardless of heading text', async () => {
    const brief = 'S1 — Introduction générale\nTexte.\nS2 — Contenu\nCorps.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[0]!.blockType).toBe('cover');
  });

  it('last slide always maps to cta', async () => {
    const brief = 'S1 — Titre\nChapeau.\nS2 — Section\nCorps.\nS3 — La fin\nMerci.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[stubs.length - 1]!.blockType).toBe('cta');
  });

  it('a slide with "appel à l\'action" in its body maps to cta even if not last', async () => {
    const brief =
      "S1 — Titre\nChapeau.\nS2 — Appel à l'action\nPassez à l'action.\nS3 — Bilan\nMots finaux.";
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('cta');
  });
});

describe('structure() parser — quoted-title extraction', () => {
  it('extracts the quoted title from guillemet delimiters when heading is "Titre"', async () => {
    const brief =
      'S1 — Titre\n« Titre réel de la présentation ».\nS2 — Section\nCorps.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[0]!.title).toBe('Titre réel de la présentation');
  });

  it('extracts quoted title from straight double quotes when heading is "Titre"', async () => {
    const brief = 'S1 — Titre\n"Mon titre exact".\nS2 — Section\nCorps.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[0]!.title).toBe('Mon titre exact');
  });

  it('uses the heading verbatim when heading is not "Titre" even if chunk has quotes', async () => {
    const brief =
      'S1 — Présentation\n« Titre entre guillemets ».\nS2 — Section\nCorps.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    // Heading is "Présentation", not "Titre", so no extraction
    expect(stubs[0]!.title).toBe('Présentation');
  });
});

describe('structure() parser — blockType keyword routing', () => {
  it('routes "tableau" keyword to table', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Tableau comparatif\nMatrice de comparaison.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('table');
  });

  it('routes "matrice" keyword to table', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Analyse\nMatrice de décision multi-critères.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('table');
  });

  it('routes "cycle de vie" in heading to timeline', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Cycle de vie du produit\nDescription.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('timeline');
  });

  it('routes "arbre de décision" keyword to cardGrid', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Arbre de décision\nDiagramme de choix.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('cardGrid');
  });

  it('routes "plan 90 jours" keyword to cardGrid', async () => {
    const brief = 'S1 — Titre\nChapeau.\nS2 — Plan 90 jours\nDétail du plan.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('cardGrid');
  });

  it('routes "kpi" keyword to stats', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — KPI principaux\nIndicateurs de performance.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('stats');
  });

  it('routes "indicateurs" keyword to stats', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Indicateurs principaux\nMétriques clés de performance.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('stats');
  });

  it('routes visual two-column cues to twoCols', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Comparaison\nAvant / après en deux colonnes.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('twoCols');
  });

  it('defaults to statement for unrecognised middle slides', async () => {
    const brief =
      'S1 — Titre\nChapeau.\nS2 — Une affirmation forte\nContenu quelconque.\nS3 — Fin\nCloture.';
    const stubs = await structure(baseDossier(brief));
    expect(stubs[1]!.blockType).toBe('statement');
  });
});

describe('structure() parser — brief with fewer than 3 S-markers falls to LLM', () => {
  it('does not fast-path when only 2 S-markers are present', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 'A', intent: 'i' },
        { blockType: 'cta', title: 'B', intent: 'i' },
      ],
    });
    const brief = 'S1 — Titre\nChapeau.\nS2 — Fin\nCloture.';
    await structure(baseDossier(brief));
    expect(generateStructured).toHaveBeenCalled();
  });

  it('repairs LLM outlines to the required cover/cta endpoints', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'statement', title: 'Opening', intent: 'frame the problem' },
        { blockType: 'statement', title: 'Middle', intent: 'explain the mechanism' },
        { blockType: 'statement', title: 'Next', intent: 'make the audience act' },
      ],
    });

    const stubs = await structure(baseDossier('brief libre'));

    expect(stubs[0]?.blockType).toBe('cover');
    expect(stubs.at(-1)?.blockType).toBe('cta');
  });
});
