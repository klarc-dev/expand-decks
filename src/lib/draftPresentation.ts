/**
 * Shared AI-draft surface — turns a natural-language brief into a Zod-validated
 * `{ slides }` payload. Both the admin draft route (`/api/draft-presentation`)
 * and the eval/smoke scripts consume this, so the LLM schema + system prompt +
 * model wiring live here once.
 *
 * This module is LLM-only: it never touches the database. The route still owns
 * persistence (`payload.update`) and authorization; this just produces slides.
 *
 * Two-pass plan→fill
 * ------------------
 * A single tool call for a long deck (20+ slides) stalls: with the gateway
 * buffering the whole non-streamed response, one giant union-array argument
 * blob runs past the wall clock. So we split:
 *
 *   Pass 1 (outline): one cheap call returns `{ blockType, title, intent }`
 *     stubs. This LOCKS the exact slide count and ordering before any body is
 *     generated — the reliable way to honour "exactly N slides".
 *   Pass 2 (fill): the stubs are chunked into small batches; each batch is one
 *     call that returns fully-populated blocks for exactly its stubs, given the
 *     brief and a short running summary for continuity. Small batches keep every
 *     call fast and never token-constrained, so quality never degrades.
 *
 * Short briefs (≤ one batch) still resolve in a single fill call; the outline
 * pass is skipped when the brief is small and gives no explicit slide count.
 *
 * The schema and prompt are derived from the block-spec SSOT (`src/blocks/spec`)
 * — `markdown` drops out via `aiDraftable: false`, image/imagePosition via
 * per-field `ai: false`. Do not hand-maintain a parallel copy here.
 */

import { z } from 'zod';

import { DRAFT_MODEL, draftObject } from './ai';
import { ALL_SPECS } from '../blocks/spec';
import {
  emitBatchSchema,
  emitOutlineSchema,
  emitSlidesArraySchema,
  type OutlineStub,
} from '../blocks/spec/emit/emitDraftSchema';
import { buildSystemPrompt } from '../blocks/spec/emit/emitPromptSection';

/** Final LLM structured-output schema: `{ slides: array(union).min(3).max(40) }`. */
export const SLIDES_SCHEMA = emitSlidesArraySchema(ALL_SPECS);

const OUTLINE_SCHEMA = emitOutlineSchema(ALL_SPECS);
const BATCH_SCHEMA = emitBatchSchema(ALL_SPECS);

/** Full layout-catalogue prompt assembled from each AI-draftable spec's `promptMeta`. */
export const DRAFT_SYSTEM_PROMPT = buildSystemPrompt(
  ALL_SPECS.flatMap((spec) => (spec.promptMeta ? [spec.promptMeta] : [])),
);

/** Validated draft payload — `slides` is the non-null union array (min 3). */
export type DraftedSlides = z.infer<typeof SLIDES_SCHEMA>;

const BATCH_SIZE = 3;

const OUTLINE_SYSTEM = `Tu planifies la structure d'une présentation à partir d'un brief en langage naturel.

Tu retournes UNIQUEMENT un plan : la liste ordonnée des diapositives, sans rédiger leur contenu. Chaque entrée a :
- blockType : le layout le plus adapté (voir le catalogue ci-dessous),
- title : le titre de la diapositive,
- intent : une phrase décrivant ce que la diapositive doit contenir (utilisée à l'étape de rédaction).

${DRAFT_SYSTEM_PROMPT}

Règles du plan :
- La PREMIÈRE diapositive est toujours un "cover", la DERNIÈRE toujours un "cta".
- Si le brief précise un nombre de diapositives (ex. "S1...S26", "~26 slides"), produis EXACTEMENT ce nombre, dans cet ordre.
- Choisis "table" pour tout tableau, matrice, échelle ou comparaison ligne/colonne.
- Respecte fidèlement l'ordre et le découpage décrits dans le brief.`;

function fillSystem(): string {
  return `Tu rédiges le contenu de diapositives déjà planifiées, à partir du brief complet.

On te donne le brief, puis un lot de diapositives à rédiger (chacune avec son blockType, son title et son intent). Tu retournes UNIQUEMENT les blocs de ce lot, entièrement remplis, dans le même ordre et avec le même blockType et title.

${DRAFT_SYSTEM_PROMPT}

Règles de rédaction :
- Conserve EXACTEMENT le blockType et le title de chaque diapositive du lot ; ne les change pas, n'en ajoute pas, n'en supprime pas.
- Remplis tous les champs pertinents du layout à partir du brief.
- Pour "table" : colonnes = en-têtes, rows = lignes alignées sur les colonnes.
- Textes concis et percutants ; reste dans la langue du brief.`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function stubLine(stub: OutlineStub, n: number): string {
  return `${n}. [${stub.blockType}] ${stub.title} — ${stub.intent}`;
}

function stubTitleLine(stub: OutlineStub, n: number): string {
  return `${n}. [${stub.blockType}] ${stub.title}`;
}

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
      intent: chunk.slice(0, 1600),
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
  if (/tableau|matrice|niveaux de confidentialité|échelle|socle contractuel/.test(text)) {
    return 'table';
  }
  if (/cycle de vie|process en \d+ temps|→.*→/.test(head)) return 'timeline';
  if (/arbre de décision|plan 90 jours|pertes évitables/.test(text)) return 'cardGrid';
  if (/minimum vital|kpi|annuité/.test(text)) return 'stats';
  if (/socle contractuel|dataroom|offboarding|déclaration d'invention/.test(text)) {
    return 'twoCols';
  }
  return 'statement';
}

/**
 * Draft slides from a natural-language brief via a two-pass plan→fill loop.
 * Throws if the model fails to call the tool or its arguments fail validation
 * (the route surfaces this as a 422).
 */
export async function draftPresentationSlides(
  brief: string,
  opts?: { model?: string },
): Promise<DraftedSlides> {
  const model = opts?.model ?? DRAFT_MODEL;

  const stubs = parseSlideBySlideBrief(brief) ?? (await draftObject({
    model,
    schema: OUTLINE_SCHEMA,
    system: OUTLINE_SYSTEM,
    prompt: brief,
  })).slides;

  const batches = chunk(stubs, BATCH_SIZE);
  const all: DraftedSlides['slides'] = [];
  const system = fillSystem();
  let done = 0;

  for (const batch of batches) {
    const planSoFar = stubs.map((s, i) => stubTitleLine(s, i + 1)).join('\n');
    const todo = batch.map((s, i) => stubLine(s, done + i + 1)).join('\n');
    const prompt = `CONTEXTE GLOBAL :\n${brief.slice(0, 2400)}\n\n---\nPLAN COMPLET (pour le contexte, ne rédige PAS tout) :\n${planSoFar}\n\n---\nLOT À RÉDIGER MAINTENANT (rends exactement ${batch.length} bloc(s), dans cet ordre) :\n${todo}`;

    const { slides } = await draftObject({
      model,
      schema: BATCH_SCHEMA,
      system,
      prompt,
    });

    all.push(...alignBatch(batch, slides));
    done += batch.length;
  }

  return { slides: all };
}

/**
 * Reconcile a filled batch against its plan: keep one block per stub, in order,
 * forcing the planned blockType/title so a model substitution can't drift the
 * deck's structure away from the locked outline.
 */
function alignBatch(
  batch: OutlineStub[],
  filled: DraftedSlides['slides'],
): DraftedSlides['slides'] {
  return batch.map((stub, i) => {
    const block = (filled[i] ?? {}) as Record<string, unknown>;
    return {
      ...block,
      blockType: stub.blockType,
      title: stub.title,
    } as DraftedSlides['slides'][number];
  });
}
