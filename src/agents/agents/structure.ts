/**
 * Structure phase (documents-plugin `outliner` → outline + coverage gate,
 * slides-adapted).
 *
 * Plans the deck as ordered slide stubs ({ blockType, title, intent }) from the
 * DeckDossier, then enforces the documents-plugin HARD COVERAGE GATE: every
 * dossier keyPoint must map to >= 1 stub, else re-plan (capped). Reuses the
 * existing OUTLINE_SYSTEM catalogue prompt and emitOutlineSchema so the layout
 * vocabulary stays SSOT-driven.
 *
 * Fast-path: if dossier.rawBrief follows the deterministic "S1 — … Sn —"
 * format (≥3 slides), the outline is parsed locally with no LLM call.
 */
import { OUTLINE_SCHEMA } from '../../blocks/spec';
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import { INTENT_MAX } from '../../lib/draftConfig';
import type { Evidence, SourceFailure, SourcePolicy } from '../../lib/sources/types';
import { languageInstruction } from '../language';
import { STRUCTURE_SYSTEM_PROMPT } from '../prompts/catalog';
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { findInformationalStyleViolations } from '../prompts/style';
import type { DeckDossier } from '../schemas';
import { researchSources } from './research';

const MAX_COVERAGE_RETRIES = 2;

function requestedSlideRange(brief: string): { min: number; max: number } | null {
  const match = brief.match(
    /\b(\d{1,2})\s*(?:[–—-]\s*(\d{1,2}))?\s+(?:slide|slides|diapositive|diapositives)\b/i,
  );
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2] ?? match[1]);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 3 || max < min) return null;
  return { min, max };
}

const STRUCTURE_INSTRUCTIONS = `Tu planifies la structure d'une présentation de formation de niveau expert à partir d'un dossier (pas d'un brief brut).

Tu retournes UNIQUEMENT un plan : la liste ordonnée des diapositives, sans rédiger leur contenu. Chaque entrée a blockType (le layout), title (un libellé concis, de préférence un groupe nominal ou une formulation elliptique — jamais une phrase complète ni de ponctuation finale), et intent (la fonction pédagogique et ce que la diapositive doit faire comprendre, distinguer, décider ou appliquer).

${STRUCTURE_SYSTEM_PROMPT}

${RUBRIC_PROMPT}

Arc du deck (sparkline) :
- Première diapositive = "cover".
- Tôt : pose le problème que le public possède (la pertinence / "so what") AVANT toute solution.
- Cœur : segmente l'idée maîtresse ; alterne les layouts, place un "section" entre deux grands groupes.
- Dernière diapositive = "cta".

Couverture (impératif) : CHAQUE point clé du dossier doit être porté par au moins une diapositive.
Les références/sources ne sont pas du contenu visible : ne planifie jamais une diapositive ou une intention "Sources" / "Références".`;

function dossierPrompt(dossier: DeckDossier): string {
  return [
    `IDÉE MAÎTRESSE : ${dossier.coreIdea}`,
    `PUBLIC : ${dossier.audience}`,
    `POURQUOI ÇA COMPTE : ${dossier.soWhat}`,
    `POINTS CLÉS (chacun doit être couvert) :\n${dossier.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
    dossier.data.length ? `DONNÉES :\n${dossier.data.map((d) => `- ${d}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function enforceOutlineEndpoints(slides: OutlineStub[]): OutlineStub[] {
  if (slides.length === 0) return slides;
  return slides.map((slide, index) => {
    if (index === 0) return { ...slide, blockType: 'cover' };
    if (index === slides.length - 1) return { ...slide, blockType: 'cta' };
    return slide;
  });
}

function outlineSchemaForBrief(brief: string) {
  const range = requestedSlideRange(brief);
  if (!range) return OUTLINE_SCHEMA;
  return OUTLINE_SCHEMA.refine(
    ({ slides }) => slides.length >= range.min && slides.length <= range.max,
    `Le brief exige entre ${range.min} et ${range.max} diapositives`,
  );
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

// ---------------------------------------------------------------------------
// Deterministic fast-path helpers (verbatim from draftPresentation.ts)
// ---------------------------------------------------------------------------

function parseSlideBySlideBrief(brief: string): OutlineStub[] | null {
  const matches = [...brief.matchAll(/^S(\d+)\s*[—-]\s*(.+)$/gm)];
  if (matches.length < 3) return null;

  return matches.map((match, index) => {
    const number = Number(match[1]);
    const heading = match[2]!.trim();
    const start = match.index! + match[0].length;
    const end = matches[index + 1]?.index ?? brief.length;
    const chunk = brief.slice(start, end).trim();
    const title = titleForExplicitSlide(heading, chunk);
    return {
      blockType: blockTypeForExplicitSlide(number, heading, chunk, index === matches.length - 1),
      title,
      intent: chunk.slice(0, INTENT_MAX),
    };
  });
}

function titleForExplicitSlide(heading: string, chunk: string): string {
  if (!/^titre$/i.test(heading.trim())) return heading;
  return chunk.match(/[«"]([^»"]+)[»"]/)?.[1]?.trim() ?? heading;
}

function blockTypeForExplicitSlide(
  number: number,
  heading: string,
  chunk: string,
  isLast: boolean,
): string {
  const head = heading.toLowerCase();
  const text = `${heading}\n${chunk}`.toLowerCase();
  if (number === 1) return 'cover';
  if (isLast || /\bcta\b|appel à l.?action/.test(text)) return 'cta';
  if (/tableau|matrice|échelle/.test(text)) {
    return 'table';
  }
  if (/cycle de vie|process en \d+ temps|→.*→/.test(head)) return 'timeline';
  if (/arbre de décision|plan \d+ jours/.test(text)) return 'cardGrid';
  if (/kpi|indicateurs?|métriques?|chiffres? clés?/.test(text)) return 'stats';
  if (/deux colonnes|comparaison|avant\s*\/\s*après|points? clés?/.test(text)) return 'twoCols';
  return 'statement';
}

// ---------------------------------------------------------------------------

const STRUCTURE_RESEARCH_INSTRUCTIONS = `Tu es le chercheur. Le plan en cours ne couvre pas encore certains points clés du dossier.

Interroge les sources sélectionnées pour trouver des faits, exemples ou angles qui aident à couvrir précisément ces points.
- N'utilise QUE ce que les sources renvoient ; ne fabrique rien.
- Reste centré sur les points non couverts ; pas de remplissage hors sujet.`;

export type StructureResult = {
  stubs: OutlineStub[];
  evidence: Evidence[];
  sourceFailures: SourceFailure[];
};

export async function structureWithProvenance(
  dossier: DeckDossier,
  sourcePolicy: SourcePolicy = { mode: 'none', sourceIds: [] },
  abortSignal?: AbortSignal,
): Promise<StructureResult> {
  const explicit = parseSlideBySlideBrief(dossier.rawBrief);
  if (explicit && findInformationalStyleViolations({ slides: explicit }).length === 0) {
    return {
      stubs: OUTLINE_SCHEMA.parse({ slides: explicit }).slides,
      evidence: [],
      sourceFailures: [],
    };
  }

  let prompt = dossierPrompt(dossier);
  const evidence: Evidence[] = [];
  const sourceFailures: SourceFailure[] = [];

  for (let attempt = 0; ; attempt++) {
    const generated = await generateStructured({
      name: 'structure',
      instructions: `${STRUCTURE_INSTRUCTIONS}\n\n${languageInstruction(dossier.language)}`,
      schema: outlineSchemaForBrief(dossier.rawBrief),
      prompt,
      validate: findInformationalStyleViolations,
      maxValidationRepairs: 3,
      modelTier: 'research',
      abortSignal,
    });
    const slides = enforceOutlineEndpoints(generated.slides);

    const uncovered = uncoveredKeyPoints(dossier, slides);
    if (uncovered.length === 0 || attempt >= MAX_COVERAGE_RETRIES) {
      return { stubs: slides, evidence, sourceFailures };
    }

    // When sources are selected and key points remain uncovered, consult the
    // sources for targeted material before the next re-plan.
    let sourceNotes = '';
    if (sourcePolicy.sourceIds.length > 0) {
      const research = await researchSources(sourcePolicy, {
        name: 'structure:research',
        instructions: STRUCTURE_RESEARCH_INSTRUCTIONS,
        prompt: `${dossierPrompt(dossier)}\n\n---\nPOINTS NON COUVERTS :\n${uncovered.map((p) => `- ${p}`).join('\n')}`,
        abortSignal,
      });
      sourceNotes = research.notes;
      evidence.push(...research.evidence);
      sourceFailures.push(...research.failures);
    }

    prompt = `${dossierPrompt(dossier)}\n\n---\nLe plan précédent NE COUVRE PAS ces points clés. Ajoute/ajuste des diapositives pour les couvrir :\n${uncovered.map((p) => `- ${p}`).join('\n')}${
      sourceNotes
        ? `\n\n---\nNOTES DE RECHERCHE (sources sélectionnées — n'utilise que le pertinent) :\n${sourceNotes}`
        : ''
    }`;
  }
}

export async function structure(
  dossier: DeckDossier,
  sourcePolicy: SourcePolicy = { mode: 'none', sourceIds: [] },
  abortSignal?: AbortSignal,
): Promise<OutlineStub[]> {
  return (await structureWithProvenance(dossier, sourcePolicy, abortSignal)).stubs;
}
