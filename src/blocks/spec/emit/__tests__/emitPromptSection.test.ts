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

Tu retournes un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa mise en page. Ces blocs sont des structures visuelles réutilisables et sans vocabulaire métier ; leur choix dépend toutefois de la relation logique entre les informations.

Layouts disponibles :

1. **cover** — Diapositive d'ouverture
   - eyebrow: accroche courte au-dessus du titre
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - intervenants: personnes affichées en cartes avatar (sélection manuelle)

2. **section** — Intercalaire de section
   - number: numéro (ex. "01")
   - title: titre (obligatoire)
   - subtitle: description

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
   - eyebrow, title (obligatoire)
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
      'intervenants: personnes affichées en cartes avatar (sélection manuelle)',
    ],
  },
  {
    index: 2,
    heading: 'section',
    summary: 'Intercalaire de section',
    lines: ['number: numéro (ex. "01")', 'title: titre (obligatoire)', 'subtitle: description'],
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
    lines: ['eyebrow, title (obligatoire)', 'stats: [{value, label}]'],
  },
  {
    index: 7,
    heading: 'quotes',
    summary: 'Grille de citations',
    lines: ['eyebrow, title (obligatoire)', 'quotes: [{quote, authorName, authorRole}]'],
  },
  {
    index: 8,
    heading: 'cta',
    summary: "Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)",
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
   - intervenants: personnes affichées en cartes avatar (sélection manuelle)`,
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
