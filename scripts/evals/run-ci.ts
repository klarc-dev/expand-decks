import { mkdir, writeFile } from 'node:fs/promises';

import {
  RevisionFixtureSchema,
  WorkflowFixtureSchema,
  EVAL_THRESHOLDS,
} from '../../src/agents/evals/config';
import { revisionDatasetV1 } from '../../src/agents/evals/datasets/revision.v1';
import { workflowDatasetV1 } from '../../src/agents/evals/datasets/workflow.v1';
import { deckContractScore } from '../../src/agents/evals/scorers/deckContract';

const fixtures = workflowDatasetV1.map((item) => WorkflowFixtureSchema.parse(item));
const revisions = revisionDatasetV1.map((item) => RevisionFixtureSchema.parse(item));
const ids = [...fixtures, ...revisions].map((item) => item.externalId);
const errors: string[] = [];
if (new Set(ids).size !== ids.length) errors.push('externalId values must be unique');
for (const [name, threshold] of Object.entries(EVAL_THRESHOLDS)) {
  if (threshold < 0 || threshold > 1) errors.push(`${name} must be between 0 and 1`);
}

const replay = {
  slides: [
    { blockType: 'cover', title: 'Decision quality' },
    { blockType: 'statement', title: 'Preserve options' },
    { blockType: 'cta', title: 'Classify the next decision' },
  ],
  markdown: '# Decision quality\n\n---\n\n# Preserve options\n\n---\n\n# Classify',
  evidence: [],
};
if (
  deckContractScore(replay, {
    minSlides: 3,
    maxSlides: 3,
    requiredBlockTypes: ['cover', 'cta'],
  }) !== 1
) {
  errors.push('deterministic deck contract replay failed');
}

const report = {
  version: 1,
  commit: process.env.GITHUB_SHA ?? 'local',
  workflowFixtures: fixtures.length,
  revisionFixtures: revisions.length,
  thresholds: EVAL_THRESHOLDS,
  errors,
};
await mkdir('artifacts/evals', { recursive: true });
await writeFile('artifacts/evals/ci.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
