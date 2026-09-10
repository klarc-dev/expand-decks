import type { z } from 'zod';

import type { WorkflowFixtureSchema } from '../config';

export const workflowDatasetV1 = [
  {
    externalId: 'bluf-en-001',
    input: {
      brief:
        'Create a 5–6 slide expert training deck for corporate lawyers explaining why leading with the conclusion improves an executive legal presentation. Cover working-memory limits, one before/after example, the strongest objection, and a practical checklist.',
      language: 'en',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 6,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [
        ['conclusion', 'verdict', 'bluf'],
        ['working memory', 'cognitive load'],
        ['objection', 'limitation'],
        ['checklist', 'practice', 'apply'],
      ],
      allowedFacts: [
        'Executive legal presentations can lead with the conclusion before explaining the supporting analysis.',
        'Working memory is limited, so listeners cannot retain an unlimited number of disconnected premises.',
        'A conclusion-first rewrite may change sequence without changing the underlying legal analysis, qualifications, or uncertainty.',
        'A practical conclusion-first checklist can cover the decision, recommendation, reasons, caveats, and requested action.',
        'Stating the conclusion first can give listeners a frame for understanding how later premises relate to the requested decision.',
        'A before/after example may use generic legal-presentation wording as long as it introduces no external legal facts.',
        'The strongest objection may be framed as a risk of oversimplification and answered by retaining reasons, caveats, and uncertainty.',
      ],
      forbiddenClaims: ['guarantees success', '100%'],
    },
  },
  {
    externalId: 'decision-fr-001',
    input: {
      brief:
        "Deck expert de 5 à 7 diapositives pour dirigeants d'ETI : distinguer une décision réversible d'une décision irréversible, montrer les critères de qualification, un cas limite et une matrice d'action.",
      language: 'fr',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 7,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [
        ['réversible', 'irréversible'],
        ['critère', 'qualification'],
        ['cas limite', 'exception'],
        ['matrice', 'action'],
      ],
      allowedFacts: [
        'Une décision réversible peut être corrigée à un coût et dans un délai acceptables.',
        'Une décision irréversible exige davantage de preuves lorsque l’engagement et le risque résiduel sont difficiles à récupérer.',
        'La qualification dépend notamment de la possibilité de revenir en arrière, du coût de correction et du risque qui subsiste après correction.',
        'Un cas limite doit être classé selon ses conditions concrètes plutôt que selon une étiquette abstraite.',
        'Une matrice d’action peut calibrer le niveau de preuve et d’engagement selon la réversibilité.',
        'La possibilité de revenir en arrière, le coût de correction et le risque résiduel peuvent être évalués selon des niveaux qualitatifs sans seuil numérique.',
        'La matrice peut recommander davantage de preuves ou un engagement plus prudent lorsque la réversibilité diminue, sans inventer de seuil chiffré.',
        'Le cas limite peut montrer des critères contradictoires et rester indéterminé tant que les conditions concrètes ne sont pas précisées.',
      ],
      forbiddenClaims: ['toujours', 'garantit'],
    },
  },
  {
    externalId: 'lawyer-role-fr-001',
    input: {
      brief:
        "Je suis avocat en droit des contrats et je dois former mon équipe commerciale pour lui expliquer le rôle et les prestations d'un avocat ; j'exerce en contrats commerciaux et innovation.",
      language: 'fr',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 10,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [
        ['conseil', 'conseiller'],
        ['rédaction', 'rédiger', 'négociation', 'négocier'],
        ['prévention', 'risque', 'sécuriser'],
        ['contentieux', 'litige', 'défense'],
        ['contrats commerciaux'],
        ['innovation'],
      ],
      allowedFacts: [
        "Un avocat peut conseiller son client en amont d'une décision ou d'une opération.",
        'Les prestations contractuelles peuvent comprendre la rédaction, la revue et la négociation de contrats.',
        "L'analyse juridique peut identifier des risques, clarifier les obligations et proposer des options de sécurisation.",
        "Un avocat peut assister ou représenter son client lorsqu'un différend ou un contentieux survient.",
        "Le brief indique que l'auteur exerce en droit des contrats, notamment en contrats commerciaux et innovation.",
        "Pour une équipe commerciale, le rôle de l'avocat peut être expliqué par les moments où elle le sollicite, les informations qu'elle lui transmet et les livrables qu'elle reçoit.",
      ],
      forbiddenClaims: [
        'prestations restant à préciser',
        'aucun catalogue de services identifiable',
        'ne permet pas de déduire les modalités des prestations',
        "le détail des prestations n'est pas renseigné",
      ],
    },
  },
  {
    externalId: 'explicit-en-001',
    input: {
      brief: `S1 — Decision quality
Executive training

S2 — Reversible decisions preserve options
Explain low-cost correction.

S3 — Irreversible decisions require evidence
Compare commitment and downside.

S4 — Apply the test
Give a three-question checklist.

S5 — Decide deliberately
CTA: classify the next decision.`,
      language: 'en',
      sourceIds: [],
      visual: false,
      approvalRequired: false,
    },
    groundTruth: {
      minSlides: 5,
      maxSlides: 5,
      requiredBlockTypes: ['cover', 'cta'],
      requiredConcepts: [['reversible'], ['irreversible'], ['checklist', 'three-question']],
      allowedFacts: [
        'Reversible decisions preserve options when they can be corrected at comparatively low cost.',
        'Irreversible decisions require stronger evidence when commitment and downside are difficult to recover.',
        'A three-question checklist can test reversibility, correction cost, and residual downside.',
      ],
      forbiddenClaims: [],
    },
  },
] satisfies Array<z.input<typeof WorkflowFixtureSchema>>;
