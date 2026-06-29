/**
 * Storage wiring smoke — proves the PostgresStore wired onto the Mastra instance
 * initializes idempotently and answers the run-query API the durable status
 * endpoint relies on. Opt-in only with RUN_DB_SMOKE_TESTS=1 and DATABASE_URL. No LLM/network call.
 */
import { describe, expect, it } from 'vitest';

import { mastra } from '../mastra';

const live =
  process.env.RUN_DB_SMOKE_TESTS === '1' && process.env.DATABASE_URL ? describe : describe.skip;

live('Mastra storage wiring', () => {
  it('lists workflow runs without crashing on schema init', { timeout: 30_000 }, async () => {
    const wf = mastra.getWorkflow('deckWorkflow');
    const runs = await wf.listWorkflowRuns({ resourceId: 'storage-smoke-none' });
    expect(Array.isArray(runs.runs)).toBe(true);
  });

  it('returns null for an unknown run id (the GET endpoint path)', {
    timeout: 30_000,
  }, async () => {
    const wf = mastra.getWorkflow('deckWorkflow');
    const run = await wf.getWorkflowRunById('00000000-0000-0000-0000-000000000000');
    expect(run).toBeNull();
  });
});
