import { mkdir, writeFile } from 'node:fs/promises';

import { runEvals } from '@mastra/core/evals';

import { EVAL_THRESHOLDS } from '../../src/agents/evals/config';
import { workflowDatasetV1 } from '../../src/agents/evals/datasets/workflow.v1';
import { deckContractGate } from '../../src/agents/evals/scorers/deckContract';
import { deckGroundingScorer, deckQualityScorer } from '../../src/agents/evals/scorers/quality';
import { deckWorkflow } from '../../src/agents/workflow';

const itemDiagnostics: Array<Record<string, unknown>> = [];

const result = await runEvals<typeof deckWorkflow>({
  target: deckWorkflow,
  data: workflowDatasetV1.map((item) => ({
    input: { ...item.input, groundingFacts: item.groundTruth.allowedFacts },
    groundTruth: item.groundTruth,
  })),
  gates: [deckContractGate],
  scorers: [
    { scorer: deckQualityScorer, threshold: EVAL_THRESHOLDS.deckQuality },
    { scorer: deckGroundingScorer, threshold: EVAL_THRESHOLDS.grounding },
  ],
  concurrency: 1,
  onItemComplete: ({ item, targetResult, scorerResults }) => {
    const output = targetResult.status === 'success' ? targetResult.result : undefined;
    itemDiagnostics.push({
      brief: typeof item.input?.brief === 'string' ? item.input.brief.slice(0, 120) : undefined,
      workflowStatus: targetResult.status,
      slideCount: output?.slides.length,
      blockTypes: output?.slides.map((slide: { blockType: string }) => slide.blockType),
      scorerResults,
    });
  },
});

const report = {
  dataset: 'deck-workflow-v1',
  commit: process.env.GITHUB_SHA ?? 'local',
  items: itemDiagnostics,
  ...result,
};
await mkdir('artifacts/evals', { recursive: true });
await writeFile('artifacts/evals/live.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (result.verdict !== 'passed') process.exitCode = 1;
