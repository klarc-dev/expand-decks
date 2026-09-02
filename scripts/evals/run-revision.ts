import { mkdir, writeFile } from 'node:fs/promises';

import { z } from 'zod';

import { generateStructured } from '../../src/agents/model';
import { revisionDatasetV1 } from '../../src/agents/evals/datasets/revision.v1';
import { EVAL_THRESHOLDS } from '../../src/agents/evals/config';
import { deckWorkflow } from '../../src/agents/workflow';

const Verdict = z.object({
  requestedChange: z.number().min(0).max(1),
  preservation: z.number().min(0).max(1),
  reason: z.string(),
});

async function runDeck(
  input: Parameters<Awaited<ReturnType<typeof deckWorkflow.createRun>>['start']>[0]['inputData'],
) {
  const run = await deckWorkflow.createRun();
  const result = await run.start({ inputData: input });
  if (result.status !== 'success') throw new Error(`revision eval workflow ${result.status}`);
  return result.result;
}

const itemResults = [];
for (const fixture of revisionDatasetV1) {
  const initial = await runDeck(fixture.initial);
  let previous = initial;
  for (const turn of fixture.turns) {
    previous = await runDeck({
      ...fixture.initial,
      brief: `${fixture.initial.brief}\n\n---\nDEMANDE DE RÉVISION :\n${turn.instruction}`,
      revisionContext: JSON.stringify(previous.slides),
    });
  }
  const verdict = await generateStructured({
    name: 'eval:revision-quality',
    instructions:
      'Judge whether the final deck performs the requested revision while preserving unrelated facts, examples, and structure. Score both dimensions independently from 0 to 1.',
    schema: Verdict,
    prompt: `EXPECTATIONS:\n${JSON.stringify(fixture.groundTruth, null, 2)}\n\nINITIAL:\n${JSON.stringify(initial, null, 2)}\n\nFINAL:\n${JSON.stringify(previous, null, 2)}`,
    modelTier: 'judge',
  });
  itemResults.push({ externalId: fixture.externalId, verdict });
}

const requestedMean =
  itemResults.reduce((sum, item) => sum + item.verdict.requestedChange, 0) / itemResults.length;
const preservationMean =
  itemResults.reduce((sum, item) => sum + item.verdict.preservation, 0) / itemResults.length;
const report = { dataset: 'deck-revision-v1', requestedMean, preservationMean, itemResults };
await mkdir('artifacts/evals', { recursive: true });
await writeFile('artifacts/evals/revision.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (
  requestedMean < EVAL_THRESHOLDS.revisionRequestedChange ||
  preservationMean < EVAL_THRESHOLDS.revisionPreservation
) {
  process.exitCode = 1;
}
