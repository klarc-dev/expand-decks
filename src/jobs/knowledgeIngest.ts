import type { TaskConfig } from 'payload';

import { runKnowledgeIngestTask } from './knowledgeIngestRunner';

export const KNOWLEDGE_INGEST_TASK = 'knowledgeIngest' as const;

export const knowledgeIngestTask = {
  slug: KNOWLEDGE_INGEST_TASK,
  label: 'Index Knowledge Document',
  concurrency: {
    key: ({ input }) => `knowledgeIngest:${(input as { documentId: number | string }).documentId}`,
    supersedes: true,
  },
  inputSchema: [{ name: 'documentId', type: 'text', required: true }],
  outputSchema: [
    { name: 'success', type: 'checkbox' },
    { name: 'chunkCount', type: 'number' },
  ],
  retries: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 10_000 },
  },
  handler: runKnowledgeIngestTask,
} satisfies TaskConfig;
