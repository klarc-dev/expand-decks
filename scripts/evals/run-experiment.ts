import { mkdir, writeFile } from 'node:fs/promises';

import { DATASET_IDS, EVAL_THRESHOLDS } from '../../src/agents/evals/config';
import { deckContractGate } from '../../src/agents/evals/scorers/deckContract';
import { deckGroundingScorer, deckQualityScorer } from '../../src/agents/evals/scorers/quality';
import { mastra } from '../../src/agents/mastra';

const dataset = await mastra.datasets.get({ id: DATASET_IDS.workflow });
const summary = await dataset.startExperiment({
  name: `main-${process.env.GITHUB_SHA ?? Date.now()}`,
  targetType: 'workflow',
  targetId: 'deckWorkflow',
  scorers: [deckContractGate, deckQualityScorer, deckGroundingScorer],
  version: 1,
  maxConcurrency: 1,
  itemTimeout: 480_000,
  maxRetries: 1,
});

const serialized = JSON.parse(JSON.stringify(summary)) as Record<string, unknown>;
await mkdir('artifacts/evals', { recursive: true });
const path = `artifacts/evals/experiment-${DATASET_IDS.workflow}-${process.env.GITHUB_SHA ?? 'local'}.json`;
await writeFile(path, `${JSON.stringify(serialized, null, 2)}\n`);
console.log(JSON.stringify(serialized, null, 2));

const failed = Number(serialized.failedCount ?? 0);
const completedWithErrors = serialized.completedWithErrors === true;
if (failed > 0 || completedWithErrors) process.exitCode = 1;
void EVAL_THRESHOLDS;
