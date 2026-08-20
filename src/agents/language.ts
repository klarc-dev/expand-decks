export type DeckLanguage = 'fr' | 'en';

const FRENCH_SIGNALS = new Set([
  'avec',
  'aux',
  'comment',
  'dans',
  'des',
  'du',
  'enjeux',
  'entre',
  'et',
  'formation',
  'juristes',
  'les',
  'pour',
  'présentation',
  'sur',
  'une',
]);

function tokens(value: string): string[] {
  return (
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .match(/[a-z]+/g) ?? []
  );
}

/** Resolve once at the workflow boundary; downstream phases never infer again. */
export function resolveTargetLanguage(
  requested: DeckLanguage | undefined,
  brief: string,
): DeckLanguage {
  if (requested) return requested;
  const frenchMatches = tokens(brief).filter((token) => FRENCH_SIGNALS.has(token)).length;
  return frenchMatches >= 2 ? 'fr' : 'en';
}

const LOCALE_POLICY: Record<DeckLanguage, string> = {
  fr: `Langue de sortie imposée : français.
- Rédige tout contenu destiné au public dans un français professionnel, idiomatique et naturel ; ne traduis jamais mot à mot.
- Les sources peuvent être multilingues : synthétise-les en français sans modifier leur sens, leurs nuances ni leur statut épistémique.
- Ne mélange pas les langues, sauf pour les noms propres, intitulés officiels, termes techniques établis ou citations exactes.
- Respecte les conventions françaises de ponctuation, de typographie et de capitalisation.
- Conserve une citation exacte dans sa langue d'origine sauf si le dossier fournit une traduction autorisée.`,
  en: `Required output language: English.
- Write all audience-facing content in idiomatic, professional English; never translate word for word.
- Sources may be multilingual: synthesize them into English without changing their meaning, nuance, or epistemic status.
- Do not mix languages except for proper nouns, official titles, established technical terms, or exact quotations.
- Follow native English punctuation, typography, and capitalization conventions.
- Preserve exact quotations in their source language unless the dossier provides an authorized translation.`,
};

export function languageInstruction(language: DeckLanguage): string {
  return LOCALE_POLICY[language];
}
