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
import type { OutlineStub } from '../../blocks/spec/emit/emitDraftSchema';
import {
  assertDocumentPages,
  documentStructuralRulesPrompt,
  type DocumentTemplateDefinition,
  documentTemplateSchemas,
  PRESENTATION_DOCUMENT_TEMPLATE,
} from '../../documents/templates';
import { INTENT_MAX, slideCountRangeSchema, type SlideCountRange } from '../../lib/draftConfig';
import type { Evidence, SourceFailure, SourcePolicy } from '../../lib/sources/types';
import { languageInstruction } from '../language';
import { generateStructured } from '../model';
import { buildStructureSystemPrompt } from '../prompts/catalog';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { findInformationalStyleViolations } from '../prompts/style';
import type { DeckDossier } from '../schemas';
import { researchSources } from './research';

const MAX_COVERAGE_RETRIES = 2;
function requestedSlideRange(brief: string): { min: number; max: number } | null {
  const match = brief.match(
    /\b(\d{1,2})\s*(?:(?:[–—-]|à|to)\s*(\d{1,2}))?\s+(?:slide|slides|diapositive|diapositives)\b/i,
  );
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2] ?? match[1]);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 3 || max < min) return null;
  return { min, max };
}

function structureInstructions(template: DocumentTemplateDefinition): string {
  return `Tu planifies la structure d'une présentation de formation de niveau expert à partir d'un dossier (pas d'un brief brut).

Tu retournes UNIQUEMENT un plan : la liste ordonnée des diapositives, sans rédiger leur contenu. Tu exécutes la demande de l'auteur dans ce plan : les diapositives planifiées sont le résultat à produire, jamais une explication de la manière de le produire. Chaque entrée a blockType (le layout), title et intent. Pour une diapositive de contenu, title énonce en une ligne la règle, la distinction ou la conséquence à retenir ; une phrase complète est autorisée, sans ponctuation finale. Le titre ne doit jamais reformuler une consigne telle que « ajouter une diapositive », « créer un exemple » ou « expliquer ce qu'il faut montrer ». Couverture, plan et intercalaires peuvent employer un libellé concis. intent décrit la substance finale destinée au public, avec les faits, conditions, réserves, sources ou actions que la diapositive rendra explicites ; jamais la consigne elle-même ni une instruction adressée au futur rédacteur.

${buildStructureSystemPrompt(template)}

${documentStructuralRulesPrompt(template)}

${RUBRIC_PROMPT}

Règles de contenu :
- Chaque diapositive d'analyse doit avoir une fonction informationnelle précise : énoncer une règle, ordonner des conditions, distinguer deux régimes, exposer une exception ou incertitude, tirer une conséquence, ou prescrire une action.
- Dans un dossier juridique ou normatif, mets dans title+intent les articles, dates, conditions cumulatives, distinctions de statut et formalités nécessaires. Ils ont priorité sur les résumés généraux.
- « Approche claire », « dispositif robuste », « enjeu essentiel », « vision globale », « il est important de » et les formules analogues ne couvrent aucun point clé.
- Les sources ne forment pas une slide autonome, mais l'intention doit indiquer quelle affirmation centrale doit recevoir une footnote.

Arc du deck (sparkline) :
- Première diapositive = "cover".
- Tôt : pose le problème que le public possède (la pertinence / "so what") AVANT toute solution.
- Cœur : segmente l'idée maîtresse ; alterne les layouts, place un "section" entre deux grands groupes.
- Dernière diapositive = "cta".

Couverture (impératif) : CHAQUE point clé du dossier doit être porté par au moins une diapositive.
Les références/sources ne sont pas du contenu visible : ne planifie jamais une diapositive ou une intention "Sources" / "Références".`;
}

function dossierPrompt(dossier: DeckDossier): string {
  return [
    `IDÉE MAÎTRESSE : ${dossier.coreIdea}`,
    `PUBLIC : ${dossier.audience}`,
    `POURQUOI ÇA COMPTE : ${dossier.soWhat}`,
    `POINTS CLÉS (chacun doit être couvert) :\n${dossier.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
    dossier.data.length ? `DONNÉES :\n${dossier.data.map((d) => `- ${d}`).join('\n')}` : '',
    dossier.references?.length
      ? `RÉFÉRENCES DISPONIBLES :\n${dossier.references.map((reference) => `- ${reference}`).join('\n')}`
      : '',
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

function finalizeOutline(
  slides: OutlineStub[],
  template: DocumentTemplateDefinition,
): OutlineStub[] {
  const finalized =
    template.id === PRESENTATION_DOCUMENT_TEMPLATE.id ? enforceOutlineEndpoints(slides) : slides;
  assertDocumentPages(template, finalized);
  return finalized;
}

function outlineSchemaForRange(
  range: SlideCountRange | null,
  template: DocumentTemplateDefinition,
) {
  const outlineSchema = documentTemplateSchemas(template).outline;
  if (!range) return outlineSchema;
  return outlineSchema.extend({
    slides: outlineSchema.shape.slides.min(range.min).max(range.max),
  });
}

function structuralSlideRange(
  requested: SlideCountRange | null,
  template: DocumentTemplateDefinition,
): SlideCountRange | null {
  if (!requested) return null;
  const min = Math.max(requested.min, template.pageCount.min);
  const max = Math.min(requested.max, template.pageCount.max ?? requested.max);
  if (min > max) {
    throw new Error(
      `Le template « ${template.id} » viole la règle de nombre total : la plage demandée ${requested.min}–${requested.max} est incompatible avec ${template.pageCount.min}–${template.pageCount.max ?? '∞'} pages.`,
    );
  }
  return { min, max };
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

function parseRevisionContext(
  revisionContext: string,
  revisionBrief: string,
  template: DocumentTemplateDefinition,
): OutlineStub[] | null {
  try {
    const slides = JSON.parse(revisionContext);
    if (!Array.isArray(slides) || slides.length < 3) return null;
    return documentTemplateSchemas(template).outline.parse({
      slides: slides.map((slide, index) => {
        const targetsEveryTitle = /\b(?:titres?|titles?|tone|ton)\b/i.test(revisionBrief);
        const targetsFinalSlide =
          index === slides.length - 1 &&
          /\b(?:final|finale?|derni[eè]re?|cta|checklist)\b/i.test(revisionBrief);
        const titleDirective = targetsEveryTitle
          ? 'Réécris uniquement le titre afin de satisfaire la demande de révision, même si le titre existant paraît déjà acceptable. Préserve le blockType et tous les autres champs exactement.'
          : 'Préserve intégralement';
        const directive = targetsFinalSlide ? 'Modifie' : titleDirective;
        return {
          blockType: slide.blockType,
          title: slide.title,
          intent:
            `${directive} cette diapositive uniquement selon la demande de révision. Préserve tous ses autres éléments. Contenu existant : ${JSON.stringify(slide)}`.slice(
              0,
              INTENT_MAX,
            ),
        };
      }),
    }).slides;
  } catch {
    return null;
  }
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

function revisionChangesStructure(revisionBrief: string): boolean {
  return /\b(?:ajout\w*|add\w*|ins[eè]r\w*|insert\w*|cr[eé]\w*|create\w*|supprim\w*|remov\w*|retir\w*|delete\w*|dupliqu\w*|duplicat\w*|fusionn\w*|merg\w*|scind\w*|split\w*|r[eé]organis\w*|reorder\w*|[eé]tend\w*|extend\w*)\b[^.!?\n]{0,100}\b(?:slides?|diapositives?|deck|pr[eé]sentation)\b/iu.test(
    revisionBrief,
  );
}

function revisionPrompt(
  revisionContext?: string,
  range?: SlideCountRange,
  revisionBrief = '',
): string {
  if (!revisionContext) return '';
  if (range)
    return `\n\nDECK EXISTANT À RÉVISER :\n${revisionContext}\n\nRÈGLE DE RÉVISION : tu peux fusionner ou scinder les diapositives pour respecter la plage demandée. Préserve les faits et les points couverts ; adapte l'ordre et les layouts seulement si nécessaire. Chaque intention doit expliquer le contenu à reprendre ou à répartir.`;
  if (revisionChangesStructure(revisionBrief))
    return `\n\n---\nDECK EXISTANT À RÉVISER :\n${revisionContext}\n\nRÈGLE DE RÉVISION STRUCTURELLE : exécute la demande en créant, supprimant, déplaçant, fusionnant ou scindant seulement les diapositives nécessaires. Préserve les diapositives et contenus non concernés. Si l'auteur demande des exemples, crée les diapositives supplémentaires demandées avec un titre-message et une intention qui décrivent l'exemple final destiné au public : faits, analyse et conclusion. Ne crée jamais une diapositive qui explique comment ajouter, rédiger ou construire ces exemples.`;
  return `\n\n---\nDECK EXISTANT À RÉVISER :\n${revisionContext}\n\nRÈGLE DE RÉVISION : conserve exactement le nombre, l'ordre et le blockType des diapositives existantes. Conserve aussi chaque titre et intention sauf lorsque la demande de révision exige explicitement de les modifier. Ne crée, ne supprime et ne remplace aucune diapositive hors du périmètre demandé.`;
}

export async function structureWithProvenance(
  dossier: DeckDossier,
  sourcePolicy: SourcePolicy = { mode: 'none', sourceIds: [] },
  abortSignal?: AbortSignal,
  revisionContext?: string,
  userId?: string,
  slideCountRange?: SlideCountRange,
  template: DocumentTemplateDefinition = PRESENTATION_DOCUMENT_TEMPLATE,
): Promise<StructureResult> {
  const requestedRange = slideCountRange
    ? slideCountRangeSchema.parse(slideCountRange)
    : requestedSlideRange(dossier.rawBrief);
  const range = structuralSlideRange(requestedRange, template);
  const schema = outlineSchemaForRange(range, template);
  if (revisionContext && !revisionChangesStructure(dossier.rawBrief)) {
    const preserved = parseRevisionContext(revisionContext, dossier.rawBrief, template);
    if (preserved && (!slideCountRange || schema.safeParse({ slides: preserved }).success)) {
      return { stubs: finalizeOutline(preserved, template), evidence: [], sourceFailures: [] };
    }
  }
  const explicit = parseSlideBySlideBrief(dossier.rawBrief);
  if (
    explicit &&
    (!range || schema.safeParse({ slides: explicit }).success) &&
    findInformationalStyleViolations({ slides: explicit }).length === 0
  ) {
    return {
      stubs: finalizeOutline(schema.parse({ slides: explicit }).slides, template),
      evidence: [],
      sourceFailures: [],
    };
  }

  const countPrompt = range
    ? `\n\nNOMBRE DE DIAPOSITIVES : génère entre ${range.min} et ${range.max} diapositives, bornes incluses (couverture, intercalaires et conclusion compris). Cette cible est prioritaire sur tout nombre indiqué ailleurs et sur la plage par défaut. Répartis les points sans remplissage ni faits inventés.`
    : '';
  let prompt = `${dossierPrompt(dossier)}${revisionPrompt(revisionContext, slideCountRange, dossier.rawBrief)}${countPrompt}`;
  const evidence: Evidence[] = [];
  const sourceFailures: SourceFailure[] = [];

  for (let attempt = 0; ; attempt++) {
    const generated = await generateStructured({
      name: 'structure',
      instructions: `${structureInstructions(template)}\n\n${languageInstruction(dossier.language)}`,
      schema,
      prompt,
      validate: findInformationalStyleViolations,
      maxValidationRepairs: 3,
      modelTier: 'research',
      abortSignal,
    });
    const slides = finalizeOutline(generated.slides, template);

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
        userId,
      });
      sourceNotes = research.notes;
      evidence.push(...research.evidence);
      sourceFailures.push(...research.failures);
    }

    prompt = `${dossierPrompt(dossier)}${revisionPrompt(revisionContext, slideCountRange, dossier.rawBrief)}\n\n---\nLe plan précédent NE COUVRE PAS ces points clés. Ajoute/ajuste des diapositives pour les couvrir :\n${uncovered.map((p) => `- ${p}`).join('\n')}${
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
