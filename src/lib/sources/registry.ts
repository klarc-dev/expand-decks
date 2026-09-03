import { COLLECTIONS } from '../collections';
import {
  DEFAULT_SOURCE_TIMEOUT_MS,
  SourceConfigError,
  SourceRegistrySchema,
  type KnowledgeSourceDescriptor,
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

async function listKnowledgeSourceDescriptors(
  context?: SourceResolutionContext,
): Promise<KnowledgeSourceDescriptor[]> {
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
  return result.docs.map((doc) => ({
    id: knowledgeSourceId(doc.id),
    label: doc.name,
    transport: 'knowledge' as const,
    knowledgeBaseId: doc.id,
    indexName: knowledgeIndexName(doc.id),
    allowedTools: ['search'],
    timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS,
    failureMode: 'strict' as const,
    toolCallConcurrency: 2,
    maxResultBytes: 100_000,
  }));
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
  const descriptors = await listSourceDescriptors(context);
  return descriptors.map(({ id, label, transport }) => ({ id, label, transport }));
}

export async function listKnowledgeSourceOptions(
  context: SourceResolutionContext,
): Promise<SourceOption[]> {
  return (await listKnowledgeSourceDescriptors(context)).map(({ id, label, transport }) => ({
    id,
    label,
    transport,
  }));
}

export async function listMcpSourceOptions(): Promise<SourceOption[]> {
  return (await listMcpSourceDescriptors()).map(({ id, label, transport }) => ({
    id,
    label,
    transport,
  }));
}

export function __resetSourceRegistryForTests(): void {
  cachedRaw = undefined;
  cachedRegistry = undefined;
}

export { REGISTRY_ENV as SOURCE_REGISTRY_ENV };
