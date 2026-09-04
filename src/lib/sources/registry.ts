import { COLLECTIONS } from '../collections';
import {
  DEFAULT_SOURCE_TIMEOUT_MS,
  SourceConfigError,
  SourceRegistrySchema,
  type KnowledgeSourceDescriptor,
  type KnowledgeSourceReadiness,
  type SourceDescriptor,
  type SourceOption,
  type SourceResolutionContext,
} from './types';

const REGISTRY_ENV = 'AGENT_SOURCE_REGISTRY_JSON';
const KNOWLEDGE_PREFIX = 'knowledge_';

let cachedRaw: string | undefined;
let cachedRegistry: SourceDescriptor[] | undefined;

function withDefaults(source: SourceDescriptor): SourceDescriptor {
  return {
    ...source,
    timeoutMs: source.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS,
  } as SourceDescriptor;
}

function parseRegistry(raw: string | undefined): SourceDescriptor[] {
  if (!raw?.trim()) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new SourceConfigError(
      `${REGISTRY_ENV} must be a JSON array of source descriptors: ${(error as Error).message}`,
    );
  }

  const parsed = SourceRegistrySchema.safeParse(json);
  if (!parsed.success) {
    throw new SourceConfigError(
      `${REGISTRY_ENV} is invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
        .join('; ')}`,
    );
  }

  const ids = new Set<string>();
  for (const source of parsed.data) {
    if (ids.has(source.id)) {
      throw new SourceConfigError(`${REGISTRY_ENV} contains duplicate source id: ${source.id}`);
    }
    ids.add(source.id);
  }

  return parsed.data.map(withDefaults);
}

async function listMcpSourceDescriptors(): Promise<SourceDescriptor[]> {
  const raw = process.env[REGISTRY_ENV];
  if (cachedRegistry && cachedRaw === raw) return cachedRegistry;
  cachedRaw = raw;
  cachedRegistry = parseRegistry(raw);
  return cachedRegistry;
}

function knowledgeSourceId(knowledgeBaseId: string | number): string {
  return `${KNOWLEDGE_PREFIX}${knowledgeBaseId}`;
}

function knowledgeIndexName(knowledgeBaseId: string | number): string {
  return knowledgeSourceId(knowledgeBaseId).replace(/[^a-zA-Z0-9_]/g, '_');
}

type KnowledgeBaseSourceRecord = {
  id: string | number;
  name: string;
};

type KnowledgeDocumentState = {
  knowledgeBase?: string | number | { id: string | number } | null;
  indexingStatus?: string | null;
};

function relatedKnowledgeBaseId(document: KnowledgeDocumentState): string | number | undefined {
  if (document.knowledgeBase && typeof document.knowledgeBase === 'object') {
    return document.knowledgeBase.id;
  }
  return document.knowledgeBase ?? undefined;
}

function knowledgeReadiness(documents: KnowledgeDocumentState[]): KnowledgeSourceReadiness {
  if (documents.length === 0) return 'empty';
  if (documents.some((document) => document.indexingStatus === 'indexed')) return 'ready';
  if (documents.every((document) => document.indexingStatus === 'failed')) return 'failed';
  return 'unavailable';
}

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
    user: context.user,
    overrideAccess: false,
  });
  return result.docs as unknown as KnowledgeBaseSourceRecord[];
}

async function listKnowledgeSourceState(context: SourceResolutionContext): Promise<{
  bases: KnowledgeBaseSourceRecord[];
  documentsByBase: Map<string, KnowledgeDocumentState[]>;
}> {
  const bases = await listAccessibleKnowledgeBases(context);
  const documentsByBase = new Map<string, KnowledgeDocumentState[]>();
  const unresolvedBases = bases;
  if (unresolvedBases.length === 0) return { bases, documentsByBase };
  const result = await context.payload.find({
    collection: COLLECTIONS.knowledgeDocuments,
    depth: 0,
    limit: 10_000,
    pagination: false,
    user: context.user,
    overrideAccess: false,
    where: { knowledgeBase: { in: unresolvedBases.map((base) => base.id) } },
  });
  for (const document of result.docs as unknown as KnowledgeDocumentState[]) {
    const baseId = relatedKnowledgeBaseId(document);
    if (baseId === undefined) continue;
    const key = String(baseId);
    documentsByBase.set(key, [...(documentsByBase.get(key) ?? []), document]);
  }
  return { bases, documentsByBase };
}

function knowledgeDescriptor(base: KnowledgeBaseSourceRecord): KnowledgeSourceDescriptor {
  return {
    id: knowledgeSourceId(base.id),
    label: base.name,
    transport: 'knowledge' as const,
    knowledgeBaseId: base.id,
    indexName: knowledgeIndexName(base.id),
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
): Promise<SourceDescriptor[]> {
  const [mcpSources, knowledgeSources] = await Promise.all([
    listMcpSourceDescriptors(),
    listKnowledgeSourceDescriptors(context),
  ]);
  const ids = new Set(mcpSources.map((source) => source.id));
  const collision = knowledgeSources.find((source) => ids.has(source.id));
  if (collision) throw new SourceConfigError(`Duplicate source id: ${collision.id}`);
  return [...mcpSources, ...knowledgeSources];
}

export async function listSourceOptions(
  context?: SourceResolutionContext,
): Promise<SourceOption[]> {
  const [external, knowledge] = await Promise.all([
    listMcpSourceOptions(),
    context ? listKnowledgeSourceOptions(context) : Promise.resolve([]),
  ]);
  return [...external, ...knowledge];
}

export async function listKnowledgeSourceOptions(
  context: SourceResolutionContext,
): Promise<SourceOption[]> {
  const { bases, documentsByBase } = await listKnowledgeSourceState(context);
  return bases.map((base) => ({
    id: knowledgeSourceId(base.id),
    label: base.name,
    kind: 'knowledge' as const,
    readiness: knowledgeReadiness(documentsByBase.get(String(base.id)) ?? []),
  }));
}

export async function listMcpSourceOptions(): Promise<SourceOption[]> {
  return (await listMcpSourceDescriptors()).map(({ id, label }) => ({
    id,
    label,
    kind: 'external' as const,
  }));
}

export function __resetSourceRegistryForTests(): void {
  cachedRaw = undefined;
  cachedRegistry = undefined;
}

export { REGISTRY_ENV as SOURCE_REGISTRY_ENV };
