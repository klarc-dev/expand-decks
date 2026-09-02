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

Compare chaque affirmation du dossier au brief brut et aux extraits de preuve capturés. Une affirmation est autorisée seulement si elle est explicitement fournie ou découle directement de ces éléments.
- Signale les chiffres, attributions, études, exemples, scénarios, critères, causalités, effets et recommandations ajoutés par connaissance externe.
- Une reformulation fidèle est autorisée ; un enrichissement substantiel ne l'est pas.
- N'évalue pas le style ni la qualité pédagogique, uniquement l'appui factuel.`;

const DOSSIER_REPAIR_INSTRUCTIONS = `Tu répares un dossier de présentation non fondé.

Reconstruis le dossier uniquement à partir du brief brut et des extraits de preuve capturés.
- N’ajoute aucune connaissance externe, chiffre, attribution, étude, cas, critère, causalité, effet ou recommandation.
- Préserve la demande, le public, la langue et tous les détails explicitement fournis.
- Retire ou généralise chaque affirmation signalée comme non étayée.
- data doit contenir seulement des faits ou exemples explicitement présents dans les éléments autorisés.
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
): Promise<DeckDossier> {
  const authorized = `BRIEF BRUT :\n${dossier.rawBrief}\n\nPREUVES CAPTURÉES :\n${evidenceText(evidence)}`;
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
    abortSignal,
  });
}
