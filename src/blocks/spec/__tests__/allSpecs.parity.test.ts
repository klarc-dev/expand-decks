import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CardGridBlock } from '../../CardGridBlock';
import { CoverBlock } from '../../CoverBlock';
import { CtaBlock } from '../../CtaBlock';
import { MarkdownBlock } from '../../MarkdownBlock';
import { QuotesBlock } from '../../QuotesBlock';
import { SectionBlock } from '../../SectionBlock';
import { StatementBlock } from '../../StatementBlock';
import { StatsBlock } from '../../StatsBlock';
import { TableBlock } from '../../TableBlock';
import { TimelineBlock } from '../../TimelineBlock';
import { MermaidBlock } from '../../MermaidBlock';
import { AgendaBlock } from '../../AgendaBlock';
import { TwoColsBlock } from '../../TwoColsBlock';
import { aiSchemaOf } from '../dsl';
import { ALL_SPECS } from '../index';
import { emitPayloadBlock } from '../emit/emitPayloadBlock';
import { emitSlidesArraySchema } from '../emit/emitDraftSchema';
import { buildSystemPrompt } from '../emit/emitPromptSection';

const DRAFTABLE = ALL_SPECS.filter((spec) => spec.aiDraftable);

// Golden roster of AI-draftable blockTypes, in order. This is the EXTERNAL
// anchor that keeps the union assertions strong: derived lists track ALL_SPECS
// and so silently shrink when a block is dropped, but the generated union must
// still match THIS fixed roster — so a removed or renamed draftable fails here.
const EXPECTED_DRAFTABLE = [
  'cover',
  'section',
  'statement',
  'twoCols',
  'cardGrid',
  'stats',
  'quotes',
  'cta',
  'table',
  'timeline',
  'mermaid',
  'agenda',
] as const;

// Minimal valid object for a draftable member: blockType + title + any other
// required top-level string field (e.g. mermaid `source`), derived from the
// spec's OWN aiSchema so it tracks future required fields instead of silently
// weakening the union assertions.
const minimalSlide = (spec: (typeof ALL_SPECS)[number]) => {
  const shape = (aiSchemaOf(spec) as z.ZodObject).shape as Record<string, z.ZodType>;
  const slide: Record<string, unknown> = { blockType: spec.blockType, title: 'x' };
  for (const [key, field] of Object.entries(shape)) {
    if (key in slide) continue;
    if (field.safeParse(undefined).success) continue; // optional → skip
    if (field.safeParse('x').success) slide[key] = 'x'; // required string → fill
  }
  expect(aiSchemaOf(spec).safeParse(slide).success, `${spec.blockType} minimal`).toBe(true);
  return slide;
};

// blockType literals of each generated union member, read off the emitted JSON
// Schema `anyOf` — the same LLM-facing surface the deleted equality check used.
const unionBlockTypes = (schema: z.ZodType): string[] => {
  const json = z.toJSONSchema(schema, { io: 'input' }) as unknown as {
    properties: {
      slides: { items: { anyOf: { properties: { blockType: { const: string } } }[] } };
    };
  };
  return json.properties.slides.items.anyOf.map((member) => member.properties.blockType.const);
};

// The PromptMeta records on the AI-draftable specs must reproduce the original
// hand-written SYSTEM_PROMPT byte-for-byte (the parity oracle is duplicated in
// emitPromptSection.test.ts; here we assert the PRODUCTION ALL_SPECS path).
const EXPECTED_PROMPT = `Tu génères des diapositives structurées à partir d'un brief en langage naturel.

Tu retournes un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa mise en page. Ces blocs sont des structures visuelles réutilisables et sans vocabulaire métier ; leur choix dépend toutefois de la relation logique entre les informations.

Layouts disponibles :

1. **cover** — Diapositive d'ouverture
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif

2. **section** — Intercalaire de section
   - number: numéro (ex. "01")
   - title: titre (obligatoire)
   - subtitle: description

3. **statement** — Affirmation ou citation mise en avant
   - eyebrow, title (obligatoire), body, footer
   - variant: centered-hero | pull-quote | big-statement | split — varie la mise en page entre deux statements consécutifs (laisser vide = alternance auto)

4. **twoCols** — Deux colonnes avec cartes à droite
   - eyebrow, title (obligatoire), intro, leftFooter
   - rightCards: [{title, description}]

5. **cardGrid** — Grille de cartes numérotées
   - eyebrow, title (obligatoire), sidebarText
   - columns: "2" | "3" | "4"
   - cards: [{number, title, description}]

6. **stats** — Chiffres clés en grille
   - eyebrow, title (obligatoire)
   - stats: [{value, label}]

7. **quotes** — Grille de citations
   - eyebrow, title (obligatoire)
   - quotes: [{quote, authorName, authorRole}]

8. **cta** — Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
   - eyebrow, title (obligatoire), subtitle
   - primaryAction / secondaryAction: libellés de boutons
   - footerNote: petit texte en bas

9. **table** — Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)
   - eyebrow, title (obligatoire)
   - tableVariant: "reference" (standard) | "matrix" (cellules de statut). Pour une matrice, mets ✓/⚠/✗ ou "ok"/"warn"/"blocked" dans les cellules de statut.
   - columns: [{header}] — 2 à 5 colonnes
   - rows: [{cells: [{value}]}] — chaque ligne a une cellule par colonne, dans le même ordre

10. **timeline** — Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique)
   - eyebrow, title (obligatoire), footer (bandeau transverse)
   - steps: [{label, description}] — 2 à 6 étapes, dans l’ordre ; la mise en page s’adapte (rail horizontal pour les étapes courtes, vertical pour les plus longues)

11. **mermaid** — Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)
   - eyebrow, title (obligatoire), caption
   - source: code Mermaid brut UNIQUEMENT (ex. "flowchart TD\\n  A[X] --> B[Y]"), sans les délimiteurs \`\`\`

12. **agenda** — Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire
   - eyebrow, title (obligatoire)
   - items: [{label, description}] — 2 à 8 sections, dans l’ordre, numérotées automatiquement

Règles :
- Commence TOUJOURS par un bloc "cover"
- Termine TOUJOURS par un bloc "cta"
- Utilise "section" pour structurer le contenu en parties
- Utilise "table" pour tout tableau, matrice, échelle ou comparaison ligne/colonne ; chaque tableau est sur sa propre diapositive
- Utilise "timeline" pour un cycle de vie, un processus séquentiel ou un parcours chronologique (étapes ordonnées reliées par une ligne de progression)
- Utilise "mermaid" pour un diagramme de flux, un organigramme ou un workflow (à partir de code Mermaid)
- Choisis chaque layout selon la relation logique de l’information, jamais pour créer une variété décorative :
  - agenda : seulement si la carte du parcours aide réellement l’auditoire à s’orienter
  - statement : une règle, une distinction, une conclusion ou une mise en garde unique
  - twoCols : deux catégories, deux perspectives ou un contraste simple ; table si plusieurs critères doivent être croisés
  - cardGrid : ensemble de critères, options ou composantes de même niveau, pas une séquence
  - stats : chiffres sourcés dont la comparaison visuelle porte le message
  - quotes : citation exacte, attribuée et utile comme preuve ou point de vue ; jamais une citation inventée
  - table : comparaison multi-critères, matrice, référentiel ou aide à la décision
  - timeline : étapes ordonnées, phases ou chronologie
  - mermaid : relations, dépendances, flux, décisions ou organisation qu’une liste expliquerait mal
- Le choix de la langue est fourni séparément par le workflow ; ne l'infère pas ici
- Si le brief précise un nombre de diapositives, respecte-le EXACTEMENT (cover et cta inclus dans le décompte)
- Sinon, génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être concis et factuels`;

const BLOCKS = {
  cover: CoverBlock,
  section: SectionBlock,
  statement: StatementBlock,
  twoCols: TwoColsBlock,
  cardGrid: CardGridBlock,
  stats: StatsBlock,
  quotes: QuotesBlock,
  cta: CtaBlock,
  table: TableBlock,
  timeline: TimelineBlock,
  mermaid: MermaidBlock,
  agenda: AgendaBlock,
  markdown: MarkdownBlock,
} as const;

// Payload admin condition closures are recreated per emit; compare structure by
// masking functions so identical behavior is not flagged as a difference.
const mask = (o: unknown) =>
  JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === 'function' ? '[fn]' : v)));

describe('ALL_SPECS parity', () => {
  it('emits a Payload block structurally identical to each registered block', () => {
    for (const spec of ALL_SPECS) {
      const block = BLOCKS[spec.blockType as keyof typeof BLOCKS];
      expect(mask(emitPayloadBlock(spec)), spec.blockType).toEqual(mask(block));
    }
  });

  it('keeps table cells free of repeated field labels and helper text', () => {
    const table = emitPayloadBlock(ALL_SPECS.find((spec) => spec.blockType === 'table')!);
    const rows = table.fields.find((field) => 'name' in field && field.name === 'rows');
    const cells = rows && 'fields' in rows ? rows.fields[0] : undefined;
    const value = cells && 'fields' in cells ? cells.fields[0] : undefined;

    expect(value && 'label' in value ? value.label : undefined).toBe(false);
    expect(
      value && 'admin' in value
        ? (value.admin as { description?: unknown } | undefined)?.description
        : undefined,
    ).toBeUndefined();
  });

  it('builds the original SYSTEM_PROMPT from the AI-draftable specs', () => {
    const metas = ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : []));
    expect(buildSystemPrompt(metas)).toBe(EXPECTED_PROMPT);
  });

  it('bounds the generated slides array at min 3 / max 40', () => {
    const schema = emitSlidesArraySchema(ALL_SPECS);
    const slides = (n: number) => ({
      slides: Array.from({ length: n }, () => minimalSlide(DRAFTABLE[0]!)),
    });
    expect(schema.safeParse(slides(2)).success).toBe(false);
    expect(schema.safeParse(slides(3)).success).toBe(true);
    expect(schema.safeParse(slides(41)).success).toBe(false);
  });

  it('accepts a minimal valid slide for every AI-draftable spec', () => {
    const schema = emitSlidesArraySchema(ALL_SPECS);
    for (const spec of DRAFTABLE) {
      const deck = { slides: [minimalSlide(spec), minimalSlide(spec), minimalSlide(spec)] };
      expect(schema.safeParse(deck).success, spec.blockType).toBe(true);
    }
  });

  it('rejects an unknown blockType and the non-draftable markdown block', () => {
    const schema = emitSlidesArraySchema(ALL_SPECS);
    const filler = [minimalSlide(DRAFTABLE[0]!), minimalSlide(DRAFTABLE[0]!)];
    expect(
      schema.safeParse({ slides: [{ blockType: 'nope', title: 'x' }, ...filler] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ slides: [{ blockType: 'markdown', title: 'x' }, ...filler] }).success,
    ).toBe(false);
  });

  it('exposes one union member per AI-draftable spec, blockType literals matching', () => {
    expect(unionBlockTypes(emitSlidesArraySchema(ALL_SPECS))).toEqual([...EXPECTED_DRAFTABLE]);
  });

  it('marks markdown as not AI-draftable and excludes it from prompt + schema', () => {
    const markdown = ALL_SPECS.find((s) => s.blockType === 'markdown');
    expect(markdown?.aiDraftable).toBe(false);
    expect(markdown?.promptMeta).toBeUndefined();
  });

  it('keeps exactly the 12 AI-draftable layouts in the draft union', () => {
    const draftable = ALL_SPECS.filter((s) => s.aiDraftable).map((s) => s.blockType);
    expect(draftable).toEqual([...EXPECTED_DRAFTABLE]);
  });
});
