import { COLLECTIONS } from '../collections';
import {
  DEFAULT_SOURCE_TIMEOUT_MS,
  type KnowledgeSourceDescriptor,
  type KnowledgeSourceReadiness,
  type SourceOption,
  type SourceResolutionContext,
} from './types';

const KNOWLEDGE_PREFIX = 'knowledge_';

function knowledgeSourceId(knowledgeBaseId: string | number): string {
  return `${KNOWLEDGE_PREFIX}${knowledgeBaseId}`;
}

function knowledgeIndexName(knowledgeBaseId: string | number): string {
  return knowledgeSourceId(knowledgeBaseId).replace(/[^a-zA-Z0-9_]/g, '_');
}

type KnowledgeBaseSourceRecord = {
  id: string | number;
  name: string;
  readiness?: KnowledgeSourceReadiness | null;
};

async function listAccessibleKnowledgeBases(
  context?: SourceResolutionContext,
): Promise<KnowledgeBaseSourceRecord[]> {
  if (!context?.user) return [];
  const result = await context.payload.find({
    collection: COLLECTIONS.knowledgeBases,
    depth: 0,
    limit: 1_000,
    pagination: false,
    sort: 'name',
    select: { name: true, readiness: true },
    user: context.user,
    overrideAccess: false,
  });
  return result.docs as unknown as KnowledgeBaseSourceRecord[];
}

function knowledgeDescriptor(base: KnowledgeBaseSourceRecord): KnowledgeSourceDescriptor {
  return {
    id: knowledgeSourceId(base.id),
    label: base.name,
    transport: 'knowledge' as const,
    knowledgeBaseId: base.id,
    indexName: knowledgeIndexName(base.id),
    readiness: base.readiness ?? 'empty',
    allowedTools: ['search'],
    timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS,
    failureMode: 'strict' as const,
    toolCallConcurrency: 2,
    maxResultBytes: 100_000,
  };
}

async function listKnowledgeSourceDescriptors(
  context?: SourceResolutionContext,
): Promise<KnowledgeSourceDescriptor[]> {
  return (await listAccessibleKnowledgeBases(context)).map(knowledgeDescriptor);
}

export async function listSourceDescriptors(
  context?: SourceResolutionContext,
): Promise<KnowledgeSourceDescriptor[]> {
  return listKnowledgeSourceDescriptors(context);
}

export async function listSourceOptions(
  context?: SourceResolutionContext,
): Promise<SourceOption[]> {
  return context ? listKnowledgeSourceOptions(context) : [];
}

export async function listKnowledgeSourceOptions(
  context: SourceResolutionContext,
): Promise<SourceOption[]> {
  // Readiness is maintained on the base by the knowledge-document lifecycle;
  // listing never rescans documents.
  return (await listAccessibleKnowledgeBases(context)).map((base) => ({
    id: knowledgeSourceId(base.id),
    label: base.name,
    kind: 'knowledge' as const,
    readiness: base.readiness ?? 'empty',
  }));
}
