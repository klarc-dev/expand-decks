import {
  DATASET_IDS,
  DeckGroundTruthSchema,
  DeckEvalInputSchema,
} from '../../src/agents/evals/config';
import { workflowDatasetV1 } from '../../src/agents/evals/datasets/workflow.v1';
import { mastra } from '../../src/agents/mastra';

async function getOrCreate() {
  try {
    return await mastra.datasets.get({ id: DATASET_IDS.workflow });
  } catch {
    return mastra.datasets.create({
      id: DATASET_IDS.workflow,
      name: 'Deck workflow v1',
      description: 'Immutable v1 bilingual and explicit-structure workflow fixtures.',
      inputSchema: DeckEvalInputSchema,
      groundTruthSchema: DeckGroundTruthSchema,
      targetType: 'workflow',
      targetIds: ['deckWorkflow'],
      scorerIds: ['deck-contract', 'deck-quality', 'deck-grounding'],
      metadata: {
        fixtureVersion: 1,
        repository: 'expand-decks',
        targetPackage: '@mastra/core@1.61.0',
      },
    });
  }
}

const dataset = await getOrCreate();
await dataset.addItems({
  items: workflowDatasetV1.map((item) => ({
    externalId: item.externalId,
    input: item.input,
    groundTruth: item.groundTruth,
    metadata: { fixtureVersion: 1 },
  })),
});
console.log(JSON.stringify({ datasetId: dataset.id, seeded: workflowDatasetV1.length }, null, 2));
