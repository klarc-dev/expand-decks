import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { generateStructured } from '../../model';
import { RUBRIC_PROMPT } from '../../prompts/rubric';

const DeckQualityVerdict = z.object({
  score: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  progression: z.number().min(0).max(1),
  nonRedundancy: z.number().min(0).max(1),
  actionableConclusion: z.number().min(0).max(1),
  reason: z.string(),
});

export const deckQualityScorer = createScorer({
  id: 'deck-quality',
  name: 'Whole-deck expert quality',
  description: 'Judges coverage, progression, non-redundancy, and conclusion quality.',
})
  .analyze(async ({ run }) => ({
    verdict: await generateStructured({
      name: 'eval:deck-quality',
      instructions: `Tu juges le deck ENTIER, pas des diapositives isolées.

${RUBRIC_PROMPT}

Le score final doit refléter la couverture complète des notions demandées, une progression cohérente, l'absence de redondance, une conclusion actionnable, la langue demandée et le niveau du public.

Applique la même frontière de preuve que le juge de fondement pour évaluer la fidélité : les connaissances générales établies et les exemples génériques clairement signalés, nécessaires pour expliquer le sujet demandé, ne constituent pas une dérive de périmètre au seul motif que la liste des faits autorisés n'est pas exhaustive. Pénalise uniquement les ajouts qui introduisent une entité réelle, une fausse précision, un lien causal contesté, une garantie, une autorité externe précise ou une recommandation personnalisée que la demande n'étaye pas. Juge si les exemples enseignent la distinction demandée, pas si chaque prémisse générique figure mot pour mot dans le brief.

Déduis le score final des quatre dimensions numériques, sans appliquer de pénalité de fondement cachée déjà couverte par le juge de fondement séparé. Utilise leur moyenne arithmétique par défaut ; ne t'en écarte sensiblement que si la langue demandée, le niveau du public, le format requis ou une exigence impérative fait défaut. Ne note pas sous cette moyenne dimensionnelle pour des observations stylistiques déjà reflétées dans la progression ou la non-redondance.`,
      schema: DeckQualityVerdict,
      prompt: `REQUEST AND EXPECTATIONS:\n${JSON.stringify(
        { input: run.input, groundTruth: run.groundTruth },
        null,
        2,
      )}\n\nGENERATED DECK:\n${JSON.stringify(run.output, null, 2)}`,
    }),
  }))
  .generateScore(({ results }) => results.analyzeStepResult.verdict.score)
  .generateReason(({ results }) => results.analyzeStepResult.verdict.reason);

const GroundingVerdict = z.object({
  supportedRatio: z.number().min(0).max(1),
  unsupportedClaims: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  reason: z.string(),
});

export const deckGroundingScorer = createScorer({
  id: 'deck-grounding',
  name: 'Deck grounding',
  description: 'Checks claims against allowed facts and forbidden claims.',
})
  .analyze(async ({ run }) => ({
    verdict: await generateStructured({
      name: 'eval:deck-grounding',
      instructions: `Tu es l'auditeur des preuves. Déduis d'abord le type de tâche à partir de la demande. Lorsque l'auteur demande d'expliquer, d'enseigner ou de synthétiser un sujet, les connaissances générales établies nécessaires pour y répondre sont étayées même si la liste des faits autorisés n'est pas exhaustive. Le brief et les faits autorisés restent la seule autorité pour les affirmations propres à l'auteur, à son organisation, à ses clients ou à un cas réel, ainsi que pour les chiffres, dates, citations, attributions, études, actualités, sources précises, liens causaux contestés, garanties et recommandations personnalisées. Les exemples génériques clairement signalés sont étayés lorsqu'ils n'introduisent aucune entité réelle, autorité externe, résultat inventé ou fausse précision. Pénalise les affirmations sur des informations propres à l'auteur manquantes ou non confirmées lorsque la demande est explicative et non un audit.`,
      schema: GroundingVerdict,
      prompt: `GROUND TRUTH:\n${JSON.stringify(run.groundTruth, null, 2)}\n\nGENERATED DECK:\n${JSON.stringify(run.output, null, 2)}`,
    }),
  }))
  .generateScore(({ results }) => results.analyzeStepResult.verdict.supportedRatio)
  .generateReason(({ results }) => results.analyzeStepResult.verdict.reason);
