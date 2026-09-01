import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runEvals } from '@mastra/core/evals';

import { deckWorkflow } from '../workflow';
import { sanitizeToolResult } from '../../lib/sources/toolPolicy';
import { deckContractScore } from './contract';
import { deckGate } from './scorers';

const rows = JSON.parse(
  readFileSync(join(process.cwd(), 'src/agents/evals/dataset.v1.json'), 'utf8'),
) as Array<Record<string, unknown>>;

const evalRows = rows
  .filter((row) => 'input' in row)
  .map((row) => ({
    input: row.input as {
      brief: string;
      language: 'fr' | 'en';
      visual: boolean;
      sourceIds: string[];
      approvalRequired: boolean;
    },
  }));
const result = await runEvals<typeof deckWorkflow>({
  data: evalRows,
  target: deckWorkflow,
  scorers: [deckGate],
  gates: [deckGate],
  concurrency: 1,
  onItemComplete({ targetResult }) {
    if (process.env.AGENT_EVAL_DEBUG === '1') {
      const result = targetResult as { status?: string; result?: unknown; steps?: unknown };
      console.error(
        JSON.stringify(
          {
            status: result.status,
            contractScore: deckContractScore(result.result ?? result),
          },
          null,
          2,
        ),
      );
    }
  },
});

const adversarial = rows.find((row) => 'toolResult' in row);
if (adversarial) {
  const sanitized = JSON.stringify(sanitizeToolResult(adversarial.toolResult));
  if (sanitized.includes('Ignore previous instructions') || sanitized.includes('system prompt')) {
    throw new Error('MCP prompt-injection regression gate failed');
  }
  if (!sanitized.includes(String(adversarial.expectedSanitized))) {
    throw new Error('MCP sanitizer removed the grounded fact');
  }
}

if (result.verdict === 'failed') {
  throw new Error(`Agent evaluation gates failed: ${JSON.stringify(result.gateResults)}`);
}
console.log(JSON.stringify(result, null, 2));
