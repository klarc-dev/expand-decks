import { describe, expect, it } from 'vitest';

import { knowledgeIngestTask } from '../knowledgeIngest';

describe('knowledgeIngestTask', () => {
  it('registers a superseding concurrency key per document', () => {
    expect(knowledgeIngestTask.slug).toBe('knowledgeIngest');
    expect(knowledgeIngestTask.inputSchema).toEqual([
      { name: 'documentId', type: 'text', required: true },
    ]);
    expect(knowledgeIngestTask.concurrency).toMatchObject({ supersedes: true });
    if (typeof knowledgeIngestTask.concurrency !== 'object') throw new Error('missing concurrency');
    expect(
      knowledgeIngestTask.concurrency.key({ input: { documentId: 42 }, queue: 'default' } as never),
    ).toBe('knowledgeIngest:42');
    expect(knowledgeIngestTask.handler).toBeTypeOf('function');
  });
});
