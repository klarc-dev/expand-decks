import { createHash } from 'node:crypto';

import type { Payload, PayloadRequest } from 'payload';
import { z } from 'zod';

const SOURCE_ID_MAX = 80;
const SOURCE_LABEL_MAX = 160;
export const DEFAULT_SOURCE_TIMEOUT_MS = 30_000;

export const SourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(SOURCE_ID_MAX)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
    'Source ids may contain letters, numbers, dot, underscore and dash',
  );

const ToolNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const SourcePolicyModeSchema = z.enum(['none', 'exclusive', 'multiple']);
export type SourcePolicyMode = z.infer<typeof SourcePolicyModeSchema>;
export type SourcePolicy = { mode: SourcePolicyMode; sourceIds: string[] };

const KnowledgeSourceDescriptorSchema = z.object({
  id: SourceIdSchema,
  label: z.string().trim().min(1).max(SOURCE_LABEL_MAX),
  timeoutMs: z.number().int().min(1_000).max(300_000).default(DEFAULT_SOURCE_TIMEOUT_MS),
  allowedTools: z.array(ToolNameSchema).min(1).max(64),
  failureMode: z.literal('strict').default('strict'),
  toolCallConcurrency: z.number().int().min(1).max(4).default(2),
  maxResultBytes: z.number().int().min(1_024).max(1_000_000).default(100_000),
  transport: z.literal('knowledge'),
  knowledgeBaseId: z.union([z.string().min(1), z.number().int().positive()]),
  indexName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  readiness: z.enum(['ready', 'empty', 'failed', 'unavailable']).optional(),
});

export type SourceId = z.infer<typeof SourceIdSchema>;
export type KnowledgeSourceDescriptor = z.infer<typeof KnowledgeSourceDescriptorSchema>;
export type KnowledgeSourceReadiness = NonNullable<KnowledgeSourceDescriptor['readiness']>;
export type SourceOption = {
  id: SourceId;
  label: string;
  kind: 'knowledge';
  readiness?: KnowledgeSourceReadiness;
};
export type ResolvedSource = KnowledgeSourceDescriptor;
export type SourceResolutionContext = {
  payload: Pick<Payload, 'find'>;
  user: PayloadRequest['user'];
};

export const EvidenceSchema = z.object({
  id: z.string().regex(/^ev_[a-f0-9]{24}$/),
  sourceId: SourceIdSchema,
  sourceLabel: z.string().min(1).max(SOURCE_LABEL_MAX),
  claim: z.string().min(1).max(2_000),
  excerpt: z.string().min(1).max(20_000),
  toolName: ToolNameSchema,
  toolCallId: z.string().min(1).max(256),
  retrievedAt: z.string().datetime(),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  url: z.string().url().optional(),
  documentId: z.string().min(1).max(256).optional(),
  documentTitle: z.string().min(1).max(500).optional(),
  chunkIndex: z.number().int().min(0).optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const SourceFailureSchema = z.object({
  sourceId: SourceIdSchema,
  stage: z.enum(['connect', 'discover', 'policy', 'tool', 'sanitize']),
  code: z.enum(['timeout', 'unavailable', 'disallowed-tool', 'invalid-result', 'unknown']),
  message: z.string().max(1_000),
});
export type SourceFailure = z.infer<typeof SourceFailureSchema>;

export function contentSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function evidenceId(input: {
  sourceId: string;
  toolName: string;
  toolCallId: string;
  contentSha256: string;
}): `ev_${string}` {
  const digest = contentSha256(
    [input.sourceId, input.toolName, input.toolCallId, input.contentSha256].join('\u0000'),
  );
  return `ev_${digest.slice(0, 24)}`;
}

export class SourcePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourcePolicyError';
  }
}

export class SourceConnectorError extends Error {
  readonly failures: SourceFailure[];
  constructor(message: string, failures: SourceFailure[]) {
    super(message);
    this.name = 'SourceConnectorError';
    this.failures = failures;
  }
}

export class SourceResearchError extends Error {
  readonly failures: SourceFailure[];
  constructor(message: string, failures: SourceFailure[]) {
    super(message);
    this.name = 'SourceResearchError';
    this.failures = failures;
  }
}

export class UnknownSourceError extends Error {
  readonly unknownIds: string[];
  constructor(unknownIds: string[]) {
    super(`Unknown source id(s): ${unknownIds.join(', ')}`);
    this.name = 'UnknownSourceError';
    this.unknownIds = unknownIds;
  }
}

export class TooManySourcesError extends Error {
  readonly max: number;
  readonly count: number;
  constructor(max: number, count: number) {
    super(`Too many source ids selected (${count}); maximum is ${max}`);
    this.name = 'TooManySourcesError';
    this.max = max;
    this.count = count;
  }
}
