/**
 * The Mastra container for the agentic deck builder.
 *
 * Registers the deck workflow so it can be retrieved with type inference via
 * `mastra.getWorkflow('deckWorkflow')` — the documented-preferred access path
 * (it wires the workflow to the instance's logger/telemetry and gives full
 * input/output type inference, unlike a direct import).
 */
import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';

import { deckWorkflow } from './workflow';
import { rubricScorer } from './scorers/rubric';
import { visualScorer } from './scorers/visual';

// HMR-safe singleton: Next.js dev hot-reloads this module; without the global
// guard a new pg pool would be created on every reload until connections exhaust.
const g = global as typeof globalThis & { __mastraStorage?: PostgresStore };
if (!g.__mastraStorage) {
  g.__mastraStorage = new PostgresStore({
    id: 'mastra-storage',
    connectionString: process.env.DATABASE_URL ?? '',
    schemaName: 'mastra',
  });
}
const storage = g.__mastraStorage;

export const mastra = new Mastra({
  workflows: { deckWorkflow },
  storage,
  scorers: { rubricScorer, visualScorer },
});
