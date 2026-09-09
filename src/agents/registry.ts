import { Agent } from '@mastra/core/agent';

import { cloudCLIProxy, modelForTier, type AgentModelTier } from '../lib/ai';

const FINAL_OUTPUT_INSTRUCTION =
  "Produis directement le résultat final demandé. Ne décris jamais le travail à effectuer, ce qu'il faudrait ajouter, ni la manière de produire le résultat.";

const REGISTERED_INSTRUCTIONS = new WeakMap<object, string>();

function createDeckAgent(config: {
  id: string;
  name: string;
  description: string;
  role: string;
  modelTier: AgentModelTier;
}) {
  const instructions = `${config.role}\n\n${FINAL_OUTPUT_INSTRUCTION}`;
  const agent = new Agent({
    id: config.id,
    name: config.name,
    description: config.description,
    model: cloudCLIProxy(modelForTier(config.modelTier)),
    instructions,
  });
  REGISTERED_INSTRUCTIONS.set(agent, instructions);
  return agent;
}

export const gatherAgent = createDeckAgent({
  id: 'deck-gatherer',
  name: 'Deck gatherer',
  description: 'Collecte et organise les faits autorisés dans un dossier de présentation.',
  role: 'Tu es le documentaliste du workflow de présentation. Tu transformes les éléments disponibles en dossier factuel exploitable par les autres agents.',
  modelTier: 'research',
});

export const researchAgent = createDeckAgent({
  id: 'deck-researcher',
  name: 'Deck researcher',
  description: 'Interroge les sources autorisées et restitue uniquement des éléments étayés.',
  role: 'Tu es le chercheur du workflow de présentation. Tu exploites les outils de recherche autorisés et restitues les faits et preuves trouvés.',
  modelTier: 'research',
});

export const structureAgent = createDeckAgent({
  id: 'deck-structure-planner',
  name: 'Deck structure planner',
  description: 'Transforme un dossier en plan de diapositives orienté vers le résultat public.',
  role: "Tu es l'architecte du workflow de présentation. Tu planifies les diapositives qui constitueront le résultat final destiné au public.",
  modelTier: 'draft',
});

export const writerAgent = createDeckAgent({
  id: 'deck-slide-writer',
  name: 'Deck slide writer',
  description: 'Rédige le contenu final d’une diapositive déjà planifiée.',
  role: "Tu es le rédacteur du workflow de présentation. Tu écris le contenu final visible par le public, notamment les exemples eux-mêmes lorsqu'ils sont demandés.",
  modelTier: 'draft',
});

export const revisionAgent = createDeckAgent({
  id: 'deck-slide-reviser',
  name: 'Deck slide reviser',
  description: 'Révise une diapositive existante en appliquant la demande de l’auteur.',
  role: "Tu es le réviseur du workflow de présentation. Tu livres la version finale révisée de la diapositive sans commenter l'opération d'édition.",
  modelTier: 'draft',
});

export const rubricAgent = createDeckAgent({
  id: 'deck-content-judge',
  name: 'Deck content judge',
  description: 'Évalue la qualité pédagogique et factuelle du contenu des diapositives.',
  role: 'Tu es le juge éditorial du workflow de présentation. Tu rends le verdict structuré demandé à partir du contenu fourni.',
  modelTier: 'judge',
});

export const visualAgent = createDeckAgent({
  id: 'deck-visual-judge',
  name: 'Deck visual judge',
  description: 'Évalue la lisibilité et l’équilibre d’une diapositive rendue.',
  role: 'Tu es le juge visuel du workflow de présentation. Tu rends le verdict structuré demandé à partir du rendu fourni.',
  modelTier: 'visual',
});

export const typographyAgent = createDeckAgent({
  id: 'deck-typography-director',
  name: 'Deck typography director',
  description: 'Choisit une paire typographique adaptée à la présentation.',
  role: 'Tu es le directeur artistique typographique du workflow de présentation. Tu livres directement le choix structuré demandé.',
  modelTier: 'draft',
});

export const deckAgents = {
  gather: gatherAgent,
  research: researchAgent,
  structure: structureAgent,
  writer: writerAgent,
  revision: revisionAgent,
  rubric: rubricAgent,
  visual: visualAgent,
  typography: typographyAgent,
} as const;

export type DeckAgentRole = keyof typeof deckAgents;

export function instructionsForAgent(agent: object, invocationInstructions: string): string {
  const role = REGISTERED_INSTRUCTIONS.get(agent);
  return role ? `${role}\n\n${invocationInstructions}` : invocationInstructions;
}

export function agentForRole(role: DeckAgentRole) {
  return deckAgents[role];
}

export function agentForInvocation(name: string) {
  if (name.startsWith('writer:')) return writerAgent;
  if (name.startsWith('slide-revision:')) return revisionAgent;
  if (name === 'visualScorer') return visualAgent;
  if (name === 'rubricScorer' || name.startsWith('eval:')) return rubricAgent;
  if (name === 'font-pair') return typographyAgent;
  if (name.includes(':research') || name === 'research') return researchAgent;
  if (name.startsWith('gather')) return gatherAgent;
  if (name === 'structure') return structureAgent;
  throw new Error(`[${name}] no registered Mastra agent role`);
}
