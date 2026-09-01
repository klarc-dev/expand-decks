/** Mastra container for the durable agentic deck builder. */
import { Mastra } from '@mastra/core/mastra';
import type { RetentionConfig } from '@mastra/core/storage';
import { MastraStorageExporter, Observability, SamplingStrategyType } from '@mastra/observability';
import { PostgresStoreVNext } from '@mastra/pg';

import { rubricScorer } from './scorers/rubric';
import { visualScorer } from './scorers/visual';
import { deckWorkflow } from './workflow';

const databaseUrl = process.env.DATABASE_URL ?? '';
const observabilityDatabaseUrl = process.env.OBSERVABILITY_DATABASE_URL ?? databaseUrl;

export const AGENT_RETENTION: RetentionConfig = {
  observability: {
    spans: { maxAge: '30d', batchSize: 500 },
    metrics: { maxAge: '90d', batchSize: 500 },
    logs: { maxAge: '30d', batchSize: 500 },
    scores: { maxAge: '180d', batchSize: 500 },
    feedback: { maxAge: '365d', batchSize: 500 },
  },
  scores: { scorers: { maxAge: '180d', batchSize: 500 } },
  workflows: { workflowSnapshot: { maxAge: '30d', batchSize: 250 } },
  experiments: { experiments: { maxAge: '180d', batchSize: 250 } },
};

const g = global as typeof globalThis & { __mastraStorageVNext?: PostgresStoreVNext };
if (!g.__mastraStorageVNext) {
  g.__mastraStorageVNext = new PostgresStoreVNext({
    id: 'mastra-storage',
    connectionString: databaseUrl,
    schemaName: 'mastra',
    disableInit: process.env.NODE_ENV === 'production' || process.env.MASTRA_DISABLE_INIT === '1',
    retention: AGENT_RETENTION,
    observability: {
      connectionString: observabilityDatabaseUrl,
      schemaName: 'mastra_observability',
    },
  });
}
export const agentStorage = g.__mastraStorageVNext;

export const agentObservability = new Observability({
  configs: {
    default: {
      serviceName: 'expand-decks-agent',
      sampling:
        process.env.NODE_ENV === 'production'
          ? { type: SamplingStrategyType.RATIO, probability: 0.1 }
          : { type: SamplingStrategyType.ALWAYS },
      exporters: [new MastraStorageExporter()],
      requestContextKeys: [
        'requestId',
        'presentationId',
        'runId',
        'userId',
        'organizationId',
        'phase',
      ],
      serializationOptions: {
        maxStringLength: 512,
        maxArrayLength: 20,
        maxDepth: 4,
        maxObjectKeys: 30,
      },
      cardinality: { blockUUIDs: true },
      logging: {
        enabled: true,
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      },
    },
  },
  sensitiveDataFilter: {
    redactionStyle: 'indexed',
    redactionToken: '[REDACTED]',
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'apikey',
      'auth',
      'authorization',
      'bearer',
      'credential',
      'clientsecret',
      'privatekey',
      'refresh',
      'cookie',
      'setcookie',
      'brief',
      'agentbrief',
      'revisioncontext',
      'evidence',
      'base64',
      'image',
      'prompt',
      'messages',
    ],
  },
});

export const mastra = new Mastra({
  workflows: { deckWorkflow },
  storage: agentStorage,
  observability: agentObservability,
  scorers: { rubricScorer, visualScorer },
});
