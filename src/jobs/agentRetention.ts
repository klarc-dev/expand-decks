import type { TaskConfig } from 'payload';

import { agentStorage } from '../agents/mastra';

export const AGENT_RETENTION_TASK = 'agentRetention' as const;

export const agentRetentionTask = {
  slug: AGENT_RETENTION_TASK,
  label: 'Prune Mastra agent telemetry and completed runs',
  inputSchema: [],
  outputSchema: [{ name: 'deleted', type: 'number' }],
  retries: { attempts: 2 },
  handler: async () => {
    const results = await agentStorage.prune({
      maxRows: 100_000,
      maxBatches: 100,
      pauseMs: 25,
      signal: AbortSignal.timeout(5 * 60_000),
    });
    const incomplete = results.filter((result) => !result.done).length;
    if (incomplete) {
      console.warn(`[agentRetention] ${incomplete} retention batch(es) remain for the next run`);
    }
    return {
      output: {
        deleted: results.reduce((total, result) => total + result.deleted, 0),
      },
    };
  },
} satisfies TaskConfig;
