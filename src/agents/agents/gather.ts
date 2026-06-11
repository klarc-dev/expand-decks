/**
 * Gather phase (documents-plugin `researcher` → dossier, slides-adapted).
 *
 * Turns a natural-language brief into a structured DeckDossier: the ONE core
 * idea, audience, so-what, key points, data, sources. No web research yet
 * (a research tool can be added later); this distils the brief into the
 * substrate the Structure phase plans against.
 *
 * The LLM call uses a schema WITHOUT rawBrief (the model doesn't produce it).
 * rawBrief is injected after the call so the returned DeckDossier is complete.
 */
import { generateStructured } from '../model';
import { RUBRIC_PROMPT } from '../prompts/rubric';
import { DeckDossierSchema, type DeckDossier } from '../schemas';

const LLM_SCHEMA = DeckDossierSchema.omit({ rawBrief: true });

const GATHER_INSTRUCTIONS = `Tu es le chercheur. À partir d'un brief, tu produis un dossier structuré qui servira à planifier une présentation d'expert.

Tu extrais :
- coreIdea : LA seule idée maîtresse du deck (une phrase complète, pas un thème).
- audience : à qui s'adresse le deck et ce qu'il sait déjà.
- soWhat : pourquoi ce public doit s'en soucier — le problème qu'il possède.
- keyPoints : les points d'appui distincts (chacun une affirmation nette). C'est l'unité de couverture.
- data : faits, chiffres, exemples concrets qui ancrent les points (peut être vide).
- sources : références des faits/affirmations si disponibles (peut être vide).

${RUBRIC_PROMPT}

Reste dans la langue du brief. Ne rédige pas de diapositives — seulement le dossier.`;

export async function gather(brief: string): Promise<DeckDossier> {
  const dossier = await generateStructured({
    name: 'gather',
    instructions: GATHER_INSTRUCTIONS,
    schema: LLM_SCHEMA,
    prompt: brief,
  });
  return { ...dossier, rawBrief: brief };
}
