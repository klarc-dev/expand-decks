import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../model', () => ({ generateStructured: vi.fn() }));
vi.mock('../agents/research', () => ({ researchSources: vi.fn() }));

import { generateStructured } from '../model';
import { researchSources } from '../agents/research';
import { structure, structureWithProvenance } from '../agents/structure';
import type { DeckDossier } from '../schemas';
import type { DeckLanguage } from '../language';
import {
  SALES_SHEET_DOCUMENT_TEMPLATE,
  STANDARD_REPORT_DOCUMENT_TEMPLATE,
  VISUAL_PUBLICATION_DOCUMENT_TEMPLATE,
} from '../../documents/templates';

const mockedGenerateStructured = vi.mocked(generateStructured);
const mockedResearchSources = vi.mocked(researchSources);

beforeEach(() => {
  mockedGenerateStructured.mockReset();
  mockedResearchSources.mockReset();
  mockedResearchSources.mockResolvedValue({
    notes: '',
    evidence: [],
    failures: [],
  });
});

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

describe('structure() slide count target', () => {
  const slides = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      blockType: 'statement',
      title: `Slide ${index + 1}`,
      intent: 'Explain the topic',
    }));

  it('puts explicit bounds in the LLM prompt and schema, overriding a brief count', async () => {
    mockedGenerateStructured.mockResolvedValue({ slides: slides(25) });
    await structureWithProvenance(
      baseDossier('Create 15 slides'),
      undefined,
      undefined,
      undefined,
      undefined,
      { min: 20, max: 30 },
    );
    const call = mockedGenerateStructured.mock.calls[0]![0];
    expect(call.prompt).toContain('entre 20 et 30 diapositives');
    expect(call.prompt).toContain('prioritaire');
    expect(call.schema.safeParse({ slides: slides(19) }).success).toBe(false);
    expect(call.schema.safeParse({ slides: slides(20) }).success).toBe(true);
    expect(call.schema.safeParse({ slides: slides(30) }).success).toBe(true);
    expect(call.schema.safeParse({ slides: slides(31) }).success).toBe(false);
  });

  it.each(['explicit', 'revision'])('replans an out-of-range %s fast path', async (kind) => {
    mockedGenerateStructured.mockResolvedValue({ slides: slides(6) });
    const brief =
      kind === 'explicit'
        ? 'S1 — Introduction\nHello\nS2 — Contenu\nBody\nS3 — Fin\nAct'
        : 'Keep the facts';
    const result = await structureWithProvenance(
      baseDossier(brief),
      undefined,
      undefined,
      kind === 'revision' ? JSON.stringify(slides(3)) : undefined,
      undefined,
      { min: 5, max: 7 },
    );
    expect(result.stubs).toHaveLength(6);
    expect(mockedGenerateStructured).toHaveBeenCalledOnce();
    if (kind === 'revision') {
      expect(mockedGenerateStructured.mock.calls[0]![0].prompt).toContain('fusionner ou scinder');
      expect(mockedGenerateStructured.mock.calls[0]![0].prompt).not.toContain(
        'conserve exactement le nombre',
      );
    }
  });

  it('preserves a revision already within the requested range', async () => {
    const result = await structureWithProvenance(
      baseDossier('Keep the facts'),
      undefined,
      undefined,
      JSON.stringify(slides(6)),
      undefined,
      { min: 5, max: 7 },
    );
    expect(result.stubs).toHaveLength(6);
    expect(mockedGenerateStructured).not.toHaveBeenCalled();
  });

  it('supports an exact count and rejects invalid targets before generation', async () => {
    mockedGenerateStructured.mockResolvedValue({ slides: slides(20) });
    await structureWithProvenance(
      baseDossier('Brief'),
      undefined,
      undefined,
      undefined,
      undefined,
      { min: 20, max: 20 },
    );
    const schema = mockedGenerateStructured.mock.calls[0]![0].schema;
    expect(schema.safeParse({ slides: slides(19) }).success).toBe(false);
    expect(schema.safeParse({ slides: slides(20) }).success).toBe(true);
    await expect(
      structureWithProvenance(baseDossier('Brief'), undefined, undefined, undefined, undefined, {
        min: 30,
        max: 20,
      }),
    ).rejects.toThrow();
    expect(mockedGenerateStructured).toHaveBeenCalledOnce();
  });

  it.each([
    ['visual-publication', VISUAL_PUBLICATION_DOCUMENT_TEMPLATE],
    ['sales-sheet', SALES_SHEET_DOCUMENT_TEMPLATE],
  ] as const)(
    'preserves a valid generated layout for the one-page %s template',
    async (_id, template) => {
      mockedGenerateStructured.mockResolvedValue({
        slides: [{ blockType: 'statement', title: 'One clear message', intent: 'Explain' }],
      });

      const result = await structureWithProvenance(
        baseDossier('Support visuel en une page'),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        template,
      );

      expect(result.stubs).toEqual([
        { blockType: 'statement', title: 'One clear message', intent: 'Explain' },
      ]);
      const instructions = mockedGenerateStructured.mock.calls[0]![0].instructions;
      expect(instructions).toContain('Le document tient sur une page');
      expect(instructions).toContain('Ne planifie ni couverture séparée');
      expect(instructions).not.toContain('Première page = "cover"');
      expect(instructions).not.toContain('Dernière page = "cta"');
    },
  );

  it('gives structural rules to the agent and rejects an invalid generated report', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 'Cover', intent: 'Open' },
        { blockType: 'agenda', title: 'Agenda', intent: 'Orient' },
        { blockType: 'statement', title: 'One', intent: 'Explain' },
        { blockType: 'statement', title: 'Two', intent: 'Explain' },
        { blockType: 'table', title: 'Data', intent: 'Compare' },
        { blockType: 'cta', title: 'Close', intent: 'Act' },
      ],
    });

    await expect(
      structureWithProvenance(
        baseDossier('Rapport libre'),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        STANDARD_REPORT_DOCUMENT_TEMPLATE,
      ),
    ).rejects.toThrow('layout « stats »');
    expect(mockedGenerateStructured.mock.calls[0]![0].instructions).toContain(
      'Première page obligatoire : layout « cover »',
    );
    expect(mockedGenerateStructured.mock.calls[0]![0].instructions).toContain(
      'Layout « stats » : minimum 1, maximum 2 occurrence(s)',
    );
  });
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

  it('includes the existing deck when planning a revision', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        { blockType: 'cover', title: 'Existing title', intent: 'Keep it' },
        { blockType: 'statement', title: 'Existing body', intent: 'Keep it' },
        {
          blockType: 'cta',
          title: 'Updated action',
          intent: 'Change only the CTA',
        },
      ],
    });

    await structureWithProvenance(
      baseDossier('Replace only the final action'),
      { mode: 'none', sourceIds: [] },
      undefined,
      '[{"blockType":"cover","title":"Existing title"}]',
    );

    const prompt = mockedGenerateStructured.mock.calls[0]![0].prompt;
    expect(prompt).toContain('DECK EXISTANT À RÉVISER');
    expect(prompt).toContain('Existing title');
    expect(prompt).toContain("conserve exactement le nombre, l'ordre et le blockType");
  });

  it('replans a structural revision and requires authored example slides instead of instruction slides', async () => {
    mockedGenerateStructured.mockResolvedValue({
      slides: [
        {
          blockType: 'cover',
          title: 'Existing cover',
          intent: 'Preserve the existing cover',
        },
        {
          blockType: 'statement',
          title: 'Existing rule',
          intent: 'Preserve the existing rule',
        },
        {
          blockType: 'statement',
          title: 'Un cas concret montre la marge de position',
          intent: 'Présenter le cas concret, ses faits, son analyse et sa conclusion',
        },
        {
          blockType: 'cta',
          title: 'Existing action',
          intent: 'Preserve the existing action',
        },
      ],
    });
    const existing = [
      { blockType: 'cover', title: 'Existing cover' },
      { blockType: 'statement', title: 'Existing rule' },
      { blockType: 'cta', title: 'Existing action' },
    ];

    const result = await structureWithProvenance(
      baseDossier('Étends le deck en ajoutant des slides avec des exemples concrets.'),
      { mode: 'none', sourceIds: [] },
      undefined,
      JSON.stringify(existing),
    );

    expect(result.stubs).toHaveLength(4);
    expect(mockedGenerateStructured).toHaveBeenCalledOnce();
    const call = mockedGenerateStructured.mock.calls[0]![0];
    expect(call.prompt).toContain('crée les diapositives supplémentaires demandées');
    expect(call.prompt).toContain('final destiné au public');
    expect(call.prompt).not.toContain('conserve exactement le nombre');
    expect(call.instructions).toContain("Tu exécutes la demande de l'auteur");
    expect(call.instructions).toContain('jamais la consigne elle-même');
  });

  it('returns structure-phase evidence and failures with the outline', async () => {
    const dossier = {
      ...baseDossier('brief libre'),
      keyPoints: ['alpha decision', 'bravo outcome'],
    };
    const incomplete = [
      { blockType: 'cover', title: 'Unrelated', intent: 'Unrelated' },
      { blockType: 'cta', title: 'Act', intent: 'Act' },
    ];
    const complete = [
      { blockType: 'cover', title: 'Alpha decision', intent: 'Alpha decision' },
      {
        blockType: 'statement',
        title: 'Bravo outcome',
        intent: 'Bravo outcome',
      },
      {
        blockType: 'cta',
        title: 'Act',
        intent: 'Alpha decision bravo outcome',
      },
    ];
    mockedGenerateStructured
      .mockResolvedValueOnce({ slides: incomplete })
      .mockResolvedValueOnce({ slides: complete });
    const evidence = [{ id: 'ev_000000000000000000000000', sourceId: 'docs' }] as never;
    const failures = [
      { sourceId: 'docs', stage: 'tool', code: 'timeout', message: 'slow' },
    ] as never;
    mockedResearchSources.mockResolvedValue({
      notes: 'grounded',
      evidence,
      failures,
    });

    const result = await structureWithProvenance(dossier, {
      mode: 'multiple',
      sourceIds: ['docs'],
    });

    expect(result).toMatchObject({
      stubs: complete,
      evidence,
      sourceFailures: failures,
    });
    expect(mockedResearchSources).toHaveBeenCalledOnce();
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

  it('preserves the existing slide count, order, titles, and block types during revision', async () => {
    const existing = [
      { blockType: 'cover', title: 'Existing cover', subtitle: 'Keep me' },
      {
        blockType: 'table',
        title: 'Existing example',
        columns: ['A'],
        rows: [],
      },
      { blockType: 'cta', title: 'Existing action', actions: [] },
    ];

    const result = await structureWithProvenance(
      baseDossier('Change only the CTA'),
      { mode: 'none', sourceIds: [] },
      undefined,
      JSON.stringify(existing),
    );

    expect(result.stubs.map(({ blockType, title }) => ({ blockType, title }))).toEqual([
      { blockType: 'cover', title: 'Existing cover' },
      { blockType: 'table', title: 'Existing example' },
      { blockType: 'cta', title: 'Existing action' },
    ]);
    expect(mockedGenerateStructured).not.toHaveBeenCalled();
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
        {
          blockType: 'statement',
          title: 'Opening',
          intent: 'frame the problem',
        },
        {
          blockType: 'statement',
          title: 'Middle',
          intent: 'explain the mechanism',
        },
        {
          blockType: 'statement',
          title: 'Next',
          intent: 'make the audience act',
        },
      ],
    });

    const stubs = await structure(baseDossier('brief libre'));

    expect(stubs[0]?.blockType).toBe('cover');
    expect(stubs.at(-1)?.blockType).toBe('cta');
  });

  it.each([
    ['Create a concise 5–6 slide deck for executives', 5, 6],
    ['Deck expert de 5 à 7 diapositives pour dirigeants', 5, 7],
  ])(
    'enforces the slide range requested in a natural-language brief',
    async (rawBrief, min, max) => {
      const validSlides = Array.from({ length: max }, (_, index) => ({
        blockType: 'statement',
        title: `Slide ${index + 1}`,
        intent: `Intent ${index + 1}`,
      }));
      mockedGenerateStructured.mockResolvedValue({ slides: validSlides });

      const stubs = await structure(baseDossier(rawBrief));
      const schema = mockedGenerateStructured.mock.calls[0]![0].schema;
      const overLimit = {
        slides: Array.from({ length: 12 }, (_, index) => ({
          blockType: 'statement',
          title: `Slide ${index + 1}`,
          intent: `Intent ${index + 1}`,
        })),
      };

      expect(() => schema.parse(overLimit)).toThrow();

      expect(stubs.length).toBeGreaterThanOrEqual(min);
      expect(stubs.length).toBeLessThanOrEqual(max);
      expect(stubs[0]!.blockType).toBe('cover');
      expect(stubs.at(-1)!.blockType).toBe('cta');
    },
  );
});
