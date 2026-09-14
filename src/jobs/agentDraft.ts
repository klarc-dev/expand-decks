import type { Payload, TaskConfig, TaskHandlerArgs } from 'payload';

import { runAgentCommand } from './agentRunCommands';
import { COLLECTIONS } from '@/lib/collections';
import { withAgentModel } from '@/lib/agentModel';

export const AGENT_DRAFT_TASK = 'agentDraft' as const;

export async function runAgentDraftTask({
  input,
  req,
}: {
  input: unknown;
  req: Pick<TaskHandlerArgs<'buildSlides'>['req'], 'payload'>;
}) {
  const agentRunId = String((input as { agentRunId: string }).agentRunId);
  const payload = req.payload as Payload;
  const ledger = await payload.findByID({
    collection: COLLECTIONS.agentRuns,
    id: agentRunId,
    depth: 0,
    overrideAccess: true,
  });
  return {
    output: await withAgentModel(ledger.model || 'high', () =>
      runAgentCommand(payload, agentRunId),
    ),
  };
}

export const agentDraftTask = {
  slug: AGENT_DRAFT_TASK,
  label: 'Generate presentation with Mastra',
  concurrency: {
    key: ({ input }: { input: unknown }) =>
      `agentDraft:${String((input as { presentationId: string }).presentationId)}`,
    supersedes: true,
  },
  inputSchema: [
    { name: 'agentRunId', type: 'text', required: true },
    { name: 'presentationId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'runId', type: 'text' },
    { name: 'suspended', type: 'checkbox' },
  ],
  retries: { attempts: 2, backoff: { type: 'exponential', delay: 5_000 } },
  handler: runAgentDraftTask,
} satisfies TaskConfig;
