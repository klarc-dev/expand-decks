import { describe, expect, it } from 'vitest';

import type { PromptMeta } from '../../dsl';
import { buildSystemPrompt, emitPromptSection } from '../emitPromptSection';

/**
 * The CURRENT SYSTEM_PROMPT, copied byte-for-byte from
 * src/app/(payload)/api/draft-presentation/route.ts (the template literal that
 * spans lines 140-192). This is the parity oracle: `buildSystemPrompt(metas)`
 * must reproduce it exactly, including French accents, the em dash "—", the
 * three-space "   - " field indentation, and the blank lines between entries.
 */
const EXPECTED = `Tu génères des diapositives structurées à partir d'un brief en langage naturel.

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
- Utilise "table" pour tout tableau, matrice, échelle ou comparaison ligne/colonne ; chaque tableau est sur sa propre diapositive
- Varie les layouts pour rendre la présentation dynamique
- Reste dans la langue du brief (français par défaut si ambigu)
- Si le brief précise un nombre de diapositives, respecte-le EXACTEMENT (cover et cta inclus dans le décompte)
- Sinon, génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être concis et percutants`;

/**
 * Inline PromptMeta[] for the 8 AI-draftable blocks (markdown is excluded — it
 * is not AI-draftable). Bullets reproduce the current prompt's field lines.
 */
const metas: PromptMeta[] = [
  {
    index: 1,
    heading: 'cover',
    summary: "Diapositive d'ouverture",
    lines: [
      'eyebrow: accroche courte au-dessus du titre',
      'title: titre principal (obligatoire)',
      'subtitle: paragraphe descriptif',
      'footerLeft / footerRight: textes en bas de slide',
      'surface: "dark" | "light" | "gradient"',
    ],
  },
  {
    index: 2,
    heading: 'section',
    summary: 'Intercalaire de section',
    lines: [
      'number: numéro (ex. "01")',
      'title: titre (obligatoire)',
      'subtitle: description',
      'surface: "dark" | "light"',
    ],
  },
  {
    index: 3,
    heading: 'statement',
    summary: 'Affirmation ou citation mise en avant',
    lines: ['eyebrow, title (obligatoire), body, footer'],
  },
  {
    index: 4,
    heading: 'twoCols',
    summary: 'Deux colonnes avec cartes à droite',
    lines: [
      'eyebrow, title (obligatoire), intro, leftFooter',
      'rightCards: [{title, description}]',
    ],
  },
  {
    index: 5,
    heading: 'cardGrid',
    summary: 'Grille de cartes numérotées',
    lines: [
      'eyebrow, title (obligatoire), sidebarText',
      'columns: "2" | "3" | "4"',
      'cards: [{number, title, description}]',
    ],
  },
  {
    index: 6,
    heading: 'stats',
    summary: 'Chiffres clés en grille',
    lines: ['eyebrow, title (obligatoire), surface', 'stats: [{value, label}]'],
  },
  {
    index: 7,
    heading: 'quotes',
    summary: 'Grille de citations',
    lines: [
      'eyebrow, title (obligatoire)',
      'quotes: [{quote, authorName, authorRole}]',
    ],
  },
  {
    index: 8,
    heading: 'cta',
    summary:
      "Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)",
    lines: [
      'eyebrow, title (obligatoire), subtitle',
      'primaryAction / secondaryAction: libellés de boutons',
      'footerNote: petit texte en bas',
    ],
  },
];

describe('emitPromptSection', () => {
  it('renders one numbered entry with bold heading, em dash, and 3-space field indents', () => {
    expect(emitPromptSection(metas[0]!)).toBe(
      `1. **cover** — Diapositive d'ouverture
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - footerLeft / footerRight: textes en bas de slide
   - surface: "dark" | "light" | "gradient"`,
    );
  });

  it('renders a single-line entry (no trailing blank)', () => {
    expect(emitPromptSection(metas[2]!)).toBe(
      `3. **statement** — Affirmation ou citation mise en avant
   - eyebrow, title (obligatoire), body, footer`,
    );
  });
});

describe('buildSystemPrompt', () => {
  it('reproduces the current SYSTEM_PROMPT byte-for-byte', () => {
    expect(buildSystemPrompt(metas)).toBe(EXPECTED);
  });
});
