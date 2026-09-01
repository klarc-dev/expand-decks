import type { Payload, TaskConfig, TaskHandlerArgs } from 'payload';

import { runAgentCommand } from './agentRunCommands';

export const AGENT_DRAFT_TASK = 'agentDraft' as const;

export async function runAgentDraftTask({
  input,
  req,
}: {
  input: unknown;
  req: Pick<TaskHandlerArgs<'buildSlides'>['req'], 'payload'>;
}) {
  const agentRunId = String((input as { agentRunId: string }).agentRunId);
  return { output: await runAgentCommand(req.payload as Payload, agentRunId) };
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
