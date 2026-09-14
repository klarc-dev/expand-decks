import { Agent } from '@mastra/core/agent';

import { activeAgentModel } from '@/lib/agentModel';
import { cloudCLIProxy, modelForTier, type AgentModelTier } from '../lib/ai';
import { languageInstruction, type DeckLanguage } from './language';

const FINAL_OUTPUT_INSTRUCTION =
  "Produis directement le résultat final demandé. Ne décris jamais le travail à effectuer, ce qu'il faudrait ajouter, ni la manière de produire le résultat.";

type DeckAgentConfig = {
  id: string;
  name: string;
  description: string;
  role: string;
  modelTier: AgentModelTier;
  /**
   * Whether the agent writes audience-facing content and therefore receives the
   * output-language policy. Judges and the typography director emit verdicts or
   * choices whose language is irrelevant, so they stay unlocalized.
   */
  localized: boolean;
};

const REGISTERED_CONFIGS = new WeakMap<object, DeckAgentConfig>();

/** Any RequestContext, whatever its declared value schema (`getRaw` is untyped). */
type LanguageContext = { getRaw: (key: string) => unknown } | undefined;

function languageFrom(requestContext: LanguageContext): DeckLanguage | undefined {
  const value = requestContext?.getRaw('language');
  return value === 'fr' || value === 'en' ? value : undefined;
}

/**
 * The agent's full system instructions: role, final-output contract, and — for
 * localized roles — the output-language policy read from the request context.
 * Mastra's documented localization pattern: instructions resolve per request.
 */
function buildAgentInstructions(config: DeckAgentConfig, language?: DeckLanguage): string {
  return [
    config.role,
    FINAL_OUTPUT_INSTRUCTION,
    config.localized && language ? languageInstruction(language) : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function resolveDeckAgentModel(
  modelTier: AgentModelTier,
  requestContext?: { get: (key: 'model') => string | undefined },
) {
  return cloudCLIProxy(
    requestContext?.get('model') || activeAgentModel() || modelForTier(modelTier),
  );
}

function createDeckAgent(config: DeckAgentConfig) {
  const agent = new Agent({
    id: config.id,
    name: config.name,
    description: config.description,
    model: ({ requestContext }) => resolveDeckAgentModel(config.modelTier, requestContext),
    instructions: ({ requestContext }) =>
      buildAgentInstructions(config, languageFrom(requestContext as LanguageContext)),
  });
  REGISTERED_CONFIGS.set(agent, config);
  return agent;
}

export const gatherAgent = createDeckAgent({
  id: 'deck-gatherer',
  name: 'Deck gatherer',
  description: 'Collecte et organise les faits autorisés dans un dossier de présentation.',
  role: 'Tu es le documentaliste du workflow de présentation. Tu transformes les éléments disponibles en dossier factuel exploitable par les autres agents.',
  modelTier: 'research',
  localized: true,
});

export const researchAgent = createDeckAgent({
  id: 'deck-researcher',
  name: 'Deck researcher',
  description: 'Interroge les sources autorisées et restitue uniquement des éléments étayés.',
  role: 'Tu es le chercheur du workflow de présentation. Tu exploites les outils de recherche autorisés et restitues les faits et preuves trouvés.',
  modelTier: 'research',
  localized: true,
});

export const structureAgent = createDeckAgent({
  id: 'deck-structure-planner',
  name: 'Deck structure planner',
  description: 'Transforme un dossier en plan de diapositives orienté vers le résultat public.',
  role: "Tu es l'architecte du workflow de présentation. Tu planifies les diapositives qui constitueront le résultat final destiné au public.",
  modelTier: 'draft',
  localized: true,
});

export const writerAgent = createDeckAgent({
  id: 'deck-slide-writer',
  name: 'Deck slide writer',
  description: 'Rédige le contenu final d’une diapositive déjà planifiée.',
  role: "Tu es le rédacteur du workflow de présentation. Tu écris le contenu final visible par le public d'une diapositive déjà planifiée, notamment les exemples eux-mêmes lorsqu'ils sont demandés. Quand une correction ou une demande de révision accompagne la diapositive, tu livres la diapositive finale corrigée, jamais un commentaire sur la correction.",
  modelTier: 'draft',
  localized: true,
});

export const revisionAgent = createDeckAgent({
  id: 'deck-slide-reviser',
  name: 'Deck slide reviser',
  description: 'Révise une diapositive existante en appliquant la demande de l’auteur.',
  role: "Tu es le réviseur du workflow de présentation. Tu livres la version finale révisée de la diapositive sans commenter l'opération d'édition.",
  modelTier: 'draft',
  localized: true,
});

export const rubricAgent = createDeckAgent({
  id: 'deck-content-judge',
  name: 'Deck content judge',
  description:
    'Évalue la qualité pédagogique et factuelle du contenu des diapositives et des dossiers.',
  role: 'Tu es le juge éditorial et factuel du workflow de présentation. Tu évalues le contenu fourni (diapositive, deck ou dossier) sans le réécrire et tu rends uniquement le verdict structuré demandé.',
  modelTier: 'judge',
  localized: false,
});

export const visualAgent = createDeckAgent({
  id: 'deck-visual-judge',
  name: 'Deck visual judge',
  description: 'Évalue la lisibilité et l’équilibre d’une diapositive rendue.',
  role: "Tu es le juge visuel du workflow de présentation. Tu évalues uniquement le rendu fourni (l'image de la diapositive) et tu rends le verdict structuré demandé sans juger la rédaction.",
  modelTier: 'visual',
  localized: false,
});

export const typographyAgent = createDeckAgent({
  id: 'deck-typography-director',
  name: 'Deck typography director',
  description: 'Choisit une paire typographique adaptée à la présentation.',
  role: 'Tu es le directeur artistique typographique du workflow de présentation. Tu livres directement le choix structuré demandé.',
  modelTier: 'draft',
  localized: false,
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

/**
 * System prompt for one invocation. Mastra's per-call `instructions` option
 * REPLACES the agent's own instructions, so the registered role (and, for
 * localized roles, the language policy from `requestContext`) is re-applied
 * here ahead of the phase-specific instructions.
 */
export function instructionsForAgent(
  agent: object,
  invocationInstructions: string,
  requestContext?: LanguageContext,
): string {
  const config = REGISTERED_CONFIGS.get(agent);
  if (!config) return invocationInstructions;
  return `${buildAgentInstructions(config, languageFrom(requestContext))}\n\n${invocationInstructions}`;
}

export function agentForRole(role: DeckAgentRole) {
  return deckAgents[role];
}

/**
 * The model tier a registered agent runs on. The registry is the single source
 * of truth for tiers: callers do not choose a tier per invocation, they choose
 * an agent (by canonical name or `agentRole`), and the tier follows.
 */
export function tierForAgent(agent: object): AgentModelTier {
  const config = REGISTERED_CONFIGS.get(agent);
  if (!config) throw new Error('agent is not a registered Mastra deck agent');
  return config.modelTier;
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
