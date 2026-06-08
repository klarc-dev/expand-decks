/**
 * L4 prompt-prose emitter — turns per-block `PromptMeta` records into the
 * numbered "Layouts disponibles" entries of the AI-draft SYSTEM_PROMPT, and
 * assembles the full prompt around two HARD-CODED verbatim French constants
 * (the intro paragraph and the trailing "Règles :" block).
 *
 * Only the 8 layout entries are generated from `metas`; the intro and rules are
 * fixed prose that is not per-block, so they live here as string constants and
 * are reproduced byte-for-byte from the current hand-written prompt.
 *
 * Client-safety: imports ONLY the dsl types (plain TS) — no Payload / Next /
 * `_shared` runtime — so it stays cheap to load anywhere.
 */

import type { PromptMeta } from '../dsl';

/**
 * Fixed intro prose, verbatim from the current SYSTEM_PROMPT. Ends with the
 * "Layouts disponibles :" header plus the blank line that precedes the first
 * numbered entry, so the caller can concatenate entries directly after it.
 */
const INTRO = `Tu génères des diapositives structurées à partir d'un brief en langage naturel.

Tu retournes un tableau de blocs (slides) typés. Chaque bloc a un champ "blockType" qui détermine sa mise en page. Ces blocs sont purement des LAYOUTS : ils ne portent aucune logique métier, seulement une structure visuelle réutilisable.

Layouts disponibles :
`;

/** Fixed trailing rules block, verbatim from the current SYSTEM_PROMPT. */
const RULES = `Règles :
- Commence TOUJOURS par un bloc "cover"
- Termine TOUJOURS par un bloc "cta"
- Utilise "section" pour structurer le contenu en parties
- Utilise "table" pour tout tableau, matrice, échelle ou comparaison ligne/colonne ; chaque tableau est sur sa propre diapositive
- Varie les layouts pour rendre la présentation dynamique
- Reste dans la langue du brief (français par défaut si ambigu)
- Si le brief précise un nombre de diapositives, respecte-le EXACTEMENT (cover et cta inclus dans le décompte)
- Sinon, génère entre 8 et 15 diapositives selon la complexité du brief
- Les textes doivent être concis et percutants`;

/** Optional knobs for prompt assembly (reserved for future tuning). */
export interface BuildSystemPromptOptions {
  /** Override the fixed intro block (verbatim). Defaults to the current one. */
  intro?: string;
  /** Override the fixed rules block (verbatim). Defaults to the current one. */
  rules?: string;
}

/**
 * Render ONE numbered layout entry, exactly matching the current prompt format:
 *
 *   `N. **heading** — summary`
 *   `   - line1`
 *   `   - line2`
 *
 * The heading is wrapped in `**...**`, the summary follows an em dash (`—`),
 * and each field line is indented with three spaces then `- `.
 */
export function emitPromptSection(meta: PromptMeta): string {
  const header = `${meta.index}. **${meta.heading}** — ${meta.summary}`;
  const body = meta.lines.map((line) => `   - ${line}`).join('\n');
  return body.length > 0 ? `${header}\n${body}` : header;
}

/**
 * Assemble the FULL SYSTEM_PROMPT: fixed intro, the layout entries generated
 * from `metas` (joined by a blank line), then the fixed rules block. Entry
 * order follows the input array; callers pass metas in their `index` order.
 */
export function buildSystemPrompt(
  metas: PromptMeta[],
  opts?: BuildSystemPromptOptions,
): string {
  const intro = opts?.intro ?? INTRO;
  const rules = opts?.rules ?? RULES;
  const entries = metas.map(emitPromptSection).join('\n\n');
  return `${intro}\n${entries}\n\n${rules}`;
}
