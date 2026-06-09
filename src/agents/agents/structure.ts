/**
 * Structure phase (documents-plugin `outliner` → outline + coverage gate,
 * slides-adapted).
 *
 * Plans the deck as ordered slide stubs ({ blockType, title, intent }) from the
 * DeckDossier, then enforces the documents-plugin HARD COVERAGE GATE: every
 * dossier keyPoint must map to >= 1 stub, else re-plan (capped). Reuses the
 * existing OUTLINE_SYSTEM catalogue prompt and emitOutlineSchema so the layout
 * vocabulary stays SSOT-driven.
 */
import { ALL_SPECS } from '../../blocks/spec';
import { emitOutlineSchema, type OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import { DRAFT_SYSTEM_PROMPT } from '../../lib/draftPresentation';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import type { DeckDossier } from '../schemas';

const OUTLINE_SCHEMA = emitOutlineSchema(ALL_SPECS);

const MAX_COVERAGE_RETRIES = 2;

const STRUCTURE_INSTRUCTIONS = `Tu planifies la structure d'une présentation d'expert à partir d'un dossier (pas d'un brief brut).

Tu retournes UNIQUEMENT un plan : la liste ordonnée des diapositives, sans rédiger leur contenu. Chaque entrée a blockType (le layout), title (une AFFIRMATION, phrase complète), et intent (ce que la diapositive doit contenir).

${DRAFT_SYSTEM_PROMPT}

${RUBRIC_PROMPT}

Arc du deck (sparkline) :
- Première diapositive = "cover".
- Tôt : pose le problème que le public possède (la pertinence / "so what") AVANT toute solution.
- Cœur : segmente l'idée maîtresse ; alterne les layouts, place un "section" entre deux grands groupes.
- Dernière diapositive = "cta".

Couverture (impératif) : CHAQUE point clé du dossier doit être porté par au moins une diapositive.`;

function dossierPrompt(dossier: DeckDossier): string {
  return [
    `IDÉE MAÎTRESSE : ${dossier.coreIdea}`,
    `PUBLIC : ${dossier.audience}`,
    `POURQUOI ÇA COMPTE : ${dossier.soWhat}`,
    `POINTS CLÉS (chacun doit être couvert) :\n${dossier.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
    dossier.data.length ? `DONNÉES :\n${dossier.data.map((d) => `- ${d}`).join('\n')}` : '',
    dossier.sources.length ? `SOURCES :\n${dossier.sources.map((s) => `- ${s}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Which dossier key points are NOT mentioned by any stub's title+intent.
 * A light lexical check (shared significant tokens) — the gate is "every point
 * has a home", not exact phrasing.
 */
export function uncoveredKeyPoints(dossier: DeckDossier, stubs: OutlineStub[]): string[] {
  const haystack = stubs.map((s) => `${s.title} ${s.intent}`.toLowerCase()).join(' \n ');
  return dossier.keyPoints.filter((point) => {
    const tokens = point
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 4);
    if (tokens.length === 0) return false;
    const hits = tokens.filter((t) => haystack.includes(t)).length;
    return hits / tokens.length < 0.34; // <34% of significant tokens present → uncovered
  });
}

export async function structure(dossier: DeckDossier): Promise<OutlineStub[]> {
  let prompt = dossierPrompt(dossier);

  for (let attempt = 0; ; attempt++) {
    const { slides } = await generateStructured({
      name: 'structure',
      instructions: STRUCTURE_INSTRUCTIONS,
      schema: OUTLINE_SCHEMA,
      prompt,
    });

    const uncovered = uncoveredKeyPoints(dossier, slides);
    if (uncovered.length === 0 || attempt >= MAX_COVERAGE_RETRIES) {
      return slides;
    }
    prompt = `${dossierPrompt(dossier)}\n\n---\nLe plan précédent NE COUVRE PAS ces points clés. Ajoute/ajuste des diapositives pour les couvrir :\n${uncovered.map((p) => `- ${p}`).join('\n')}`;
  }
}
