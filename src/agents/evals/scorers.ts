import { createScorer } from '@mastra/core/evals';

import { deckContractScore } from './contract';

export const deckGate = createScorer({
  id: 'deck-contract-gate',
  name: 'Deck contract gate',
  description: 'Requires a renderable bounded deck with evidence metadata.',
}).generateScore(({ run }) => deckContractScore(run.output ?? run));
