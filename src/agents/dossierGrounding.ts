import { z } from 'zod';

import type { Evidence } from '../lib/sources/types';
import { generateStructured } from './model';
import { DeckDossierSchema, type DeckDossier } from './schemas';

const DossierGroundingVerdict = z.object({
  supported: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  reason: z.string(),
});

const DOSSIER_GROUNDING_INSTRUCTIONS = `Tu es l'auditeur factuel d'un dossier de présentation.

Compare chaque affirmation du dossier au brief brut, aux extraits de preuve capturés et au type de travail demandé.
- Lorsque l'auteur demande d'expliquer, d'enseigner ou de synthétiser un sujet, les connaissances générales établies nécessaires pour répondre à ce sujet sont autorisées ; leur mobilisation ne constitue pas une invention.
- En revanche, le brief et les preuves sont la seule autorité pour les faits propres à l’auteur, à son organisation, à ses clients ou à un cas ; ainsi que pour les chiffres, dates, citations, attributions, études, actualités et références précises.
- Signale aussi comme non étayés les scénarios présentés comme réels, les effets causaux contestables, les recommandations personnalisées et les règles normatives précises dont la juridiction ou la source n'est pas établie.
- Une reformulation fidèle et une explication générale du sujet demandé sont autorisées ; une fausse précision ou un élargissement hors sujet ne l'est pas.
- Sauf demande explicite d'audit, considère comme non étayée toute affirmation visible qui transforme l'absence d'informations sur l'auteur, son offre ou ses modalités en enseignement, avertissement ou réserve répétée. L'absence de précision doit rester silencieuse, pas devenir le thème du dossier.
- N'évalue pas le style ni la qualité pédagogique, uniquement l'appui factuel.`;

const DOSSIER_REPAIR_INSTRUCTIONS = `Tu répares un dossier de présentation non fondé.

Reconstruis le dossier à partir du brief brut, des extraits de preuve capturés et des connaissances générales établies nécessaires pour traiter le sujet expressément demandé.
- Réponds au travail demandé : si le brief demande d'expliquer ou d'enseigner un sujet, conserve les notions générales exactes qui permettent réellement de l'enseigner.
- N’ajoute aucun fait propre à l’auteur, à son organisation, à ses clients ou à un cas ; ni chiffre, date, citation, attribution, étude, actualité, scénario réel, causalité contestable, recommandation personnalisée ou règle normative précise non autorisés.
- Préserve la demande, le public, la langue et tous les détails explicitement fournis.
- Retire ou généralise chaque affirmation signalée comme non étayée, sans remplacer le contenu demandé par un inventaire de ce que le brief ne précise pas.
- Sauf demande explicite d'audit, supprime les mentions sur l'offre, les modalités ou les détails « à confirmer », « non précisés » ou « non renseignés » : elles ne doivent apparaître ni dans les points clés, ni dans les données, ni dans le contenu visible futur.
- data doit contenir seulement des faits ou exemples explicitement présents dans les éléments autorisés.
- references doit contenir seulement des citations lisibles explicitement présentes dans le brief ou les preuves capturées ; conserve les articles, dates, auteurs, organismes et URLs disponibles.
- sources doit contenir seulement les identifiants de sources présents dans les preuves capturées.`;

function evidenceText(evidence: readonly Evidence[]): string {
  return evidence.length
    ? evidence.map((item) => `[${item.sourceId}] ${item.excerpt}`).join('\n')
    : '(aucune preuve externe capturée)';
}

export async function groundDossier(
  dossier: DeckDossier,
  evidence: readonly Evidence[],
  abortSignal?: AbortSignal,
  additionalFacts: readonly string[] = [],
): Promise<DeckDossier> {
  const authorized = `BRIEF BRUT :\n${dossier.rawBrief}\n\nFAITS AUTORISÉS SUPPLÉMENTAIRES :\n${additionalFacts.length ? additionalFacts.map((fact) => `- ${fact}`).join('\n') : '(aucun)'}\n\nPREUVES CAPTURÉES :\n${evidenceText(evidence)}`;
  const verdict = await generateStructured({
    name: 'gather:grounding-audit',
    instructions: DOSSIER_GROUNDING_INSTRUCTIONS,
    schema: DossierGroundingVerdict,
    prompt: `${authorized}\n\nDOSSIER À AUDITER :\n${JSON.stringify(dossier, null, 2)}`,
    modelTier: 'judge',
    abortSignal,
  });
  if (verdict.supported) return dossier;

  return generateStructured({
    name: 'gather:grounding-repair',
    instructions: DOSSIER_REPAIR_INSTRUCTIONS,
    schema: DeckDossierSchema,
    prompt: `${authorized}\n\nDOSSIER NON FONDÉ :\n${JSON.stringify(dossier, null, 2)}\n\nAFFIRMATIONS À RETIRER OU GÉNÉRALISER :\n${verdict.unsupportedClaims.map((claim) => `- ${claim}`).join('\n')}\n\nMOTIF DE L'AUDIT : ${verdict.reason}`,
    modelTier: 'research',
    agentRole: 'research',
    abortSignal,
  });
}
