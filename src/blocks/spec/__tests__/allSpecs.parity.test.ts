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
import { TwoColsBlock } from '../../TwoColsBlock';
import { ALL_SPECS } from '../index';
import { emitPayloadBlock } from '../emit/emitPayloadBlock';
import { emitSlidesArraySchema } from '../emit/emitDraftSchema';
import { buildSystemPrompt } from '../emit/emitPromptSection';

// The exact slidesArraySchema the draft route fed to the LLM before the SSOT
// migration — verbatim from the old route.ts hand-rolled union.
const surfaceZod = (gradient: boolean) =>
  (gradient ? z.enum(['dark', 'light', 'gradient']) : z.enum(['dark', 'light'])).optional();
const eyebrowZod = z.string().optional();
const LEGACY_SLIDES_SCHEMA = z.object({
  slides: z
    .array(
      z.union([
        z.object({
          blockType: z.literal('cover'),
          eyebrow: eyebrowZod,
          title: z.string(),
          subtitle: z.string().optional(),
          footerLeft: z.string().optional(),
          footerRight: z.string().optional(),
          surface: surfaceZod(true),
        }),
        z.object({
          blockType: z.literal('section'),
          number: z.string().optional(),
          title: z.string(),
          subtitle: z.string().optional(),
          surface: surfaceZod(false),
        }),
        z.object({
          blockType: z.literal('statement'),
          eyebrow: z.string().optional(),
          title: z.string(),
          body: z.string().optional(),
          footer: z.string().optional(),
        }),
        z.object({
          blockType: z.literal('twoCols'),
          eyebrow: z.string().optional(),
          title: z.string(),
          intro: z.string().optional(),
          leftFooter: z.string().optional(),
          rightCards: z
            .array(z.object({ title: z.string(), description: z.string().optional() }))
            .optional(),
        }),
        z.object({
          blockType: z.literal('cardGrid'),
          eyebrow: z.string().optional(),
          title: z.string(),
          sidebarText: z.string().optional(),
          columns: z.enum(['2', '3', '4']).optional(),
          cards: z
            .array(
              z.object({
                number: z.string().optional(),
                title: z.string(),
                description: z.string().optional(),
              }),
            )
            .optional(),
        }),
        z.object({
          blockType: z.literal('stats'),
          eyebrow: eyebrowZod,
          title: z.string(),
          surface: surfaceZod(false),
          stats: z
            .array(z.object({ value: z.string(), label: z.string() }))
            .optional(),
        }),
        z.object({
          blockType: z.literal('quotes'),
          eyebrow: z.string().optional(),
          title: z.string(),
          quotes: z
            .array(
              z.object({
                quote: z.string(),
                authorName: z.string(),
                authorRole: z.string().optional(),
              }),
            )
            .optional(),
        }),
        z.object({
          blockType: z.literal('cta'),
          eyebrow: z.string().optional(),
          title: z.string(),
          subtitle: z.string().optional(),
          primaryAction: z.string().optional(),
          secondaryAction: z.string().optional(),
          footerNote: z.string().optional(),
        }),
      ]),
    )
    .min(3)
    .max(20),
});

// The PromptMeta records on the AI-draftable specs must reproduce the original
// hand-written SYSTEM_PROMPT byte-for-byte (the parity oracle is duplicated in
// emitPromptSection.test.ts; here we assert the PRODUCTION ALL_SPECS path).
const EXPECTED_PROMPT = `Tu génères des diapositives structurées à partir d'un brief en langage naturel.

Tu retournes un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa mise en page. Ces blocs sont purement des LAYOUTS : ils ne portent aucune logique métier, seulement une structure visuelle réutilisable.

Layouts disponibles :

1. **cover** — Diapositive d'ouverture
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - footerLeft / footerRight: textes en bas de slide
   - surface: "dark" | "light" | "gradient"

2. **section** — Intercalaire de section
   - number: numéro (ex. "01")
   - title: titre (obligatoire)
   - subtitle: description
   - surface: "dark" | "light"

3. **statement** — Affirmation ou citation mise en avant
   - eyebrow, title (obligatoire), body, footer

4. **twoCols** — Deux colonnes avec cartes à droite
   - eyebrow, title (obligatoire), intro, leftFooter
   - rightCards: [{title, description}]

5. **cardGrid** — Grille de cartes numérotées
   - eyebrow, title (obligatoire), sidebarText
   - columns: "2" | "3" | "4"
   - cards: [{number, title, description}]

6. **stats** — Chiffres clés en grille
   - eyebrow, title (obligatoire), surface
   - stats: [{value, label}]

7. **quotes** — Grille de citations
   - eyebrow, title (obligatoire)
   - quotes: [{quote, authorName, authorRole}]

8. **cta** — Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
   - eyebrow, title (obligatoire), subtitle
   - primaryAction / secondaryAction: libellés de boutons
   - footerNote: petit texte en bas

Règles :
- Commence TOUJOURS par un bloc "cover"
- Termine TOUJOURS par un bloc "cta"
- Utilise "section" pour structurer le contenu en parties
- Varie les layouts pour rendre la présentation dynamique
- Reste dans la langue du brief (français par défaut si ambigu)
- Si le brief précise un nombre de diapositives, respecte-le EXACTEMENT (cover et cta inclus dans le décompte)
- Sinon, génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être concis et percutants`;

const BLOCKS = {
  cover: CoverBlock,
  section: SectionBlock,
  statement: StatementBlock,
  twoCols: TwoColsBlock,
  cardGrid: CardGridBlock,
  stats: StatsBlock,
  quotes: QuotesBlock,
  cta: CtaBlock,
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

  it('builds the original SYSTEM_PROMPT from the AI-draftable specs', () => {
    const metas = ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : []));
    expect(buildSystemPrompt(metas)).toBe(EXPECTED_PROMPT);
  });

  it('emits the legacy slidesArraySchema JSON Schema (LLM contract unchanged)', () => {
    const toJson = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input' });
    expect(toJson(emitSlidesArraySchema(ALL_SPECS))).toEqual(toJson(LEGACY_SLIDES_SCHEMA));
  });

  it('marks markdown as not AI-draftable and excludes it from prompt + schema', () => {
    const markdown = ALL_SPECS.find((s) => s.blockType === 'markdown');
    expect(markdown?.aiDraftable).toBe(false);
    expect(markdown?.promptMeta).toBeUndefined();
  });

  it('keeps exactly the 8 AI-draftable layouts in the draft union', () => {
    const draftable = ALL_SPECS.filter((s) => s.aiDraftable).map((s) => s.blockType);
    expect(draftable).toEqual([
      'cover',
      'section',
      'statement',
      'twoCols',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
    ]);
  });
});
