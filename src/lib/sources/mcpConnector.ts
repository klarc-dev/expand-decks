import { randomUUID } from 'node:crypto';

import { Tool } from '@mastra/core/tools';
import { MCPClient, type MastraMCPServerDefinition } from '@mastra/mcp';
import { z } from 'zod';

import {
  embedKnowledgeQuery,
  knowledgeVectorStore,
  type KnowledgeQueryResult,
  type KnowledgeVectorStore,
} from './knowledgeVector';
import { sanitizeToolResult } from './toolPolicy';
import {
  evidenceId,
  SourceConnectorError,
  type Evidence,
  type ResolvedSource,
  type SourceFailure,
} from './types';

type ToolMap = Record<string, Tool<any, any, any, any>>;

export type EvidenceRecorder = {
  record(evidence: Evidence): void;
  snapshot(): Evidence[];
};

export function createEvidenceRecorder(): EvidenceRecorder {
  const records = new Map<string, Evidence>();
  return {
    record(evidence) {
      records.set(evidence.id, evidence);
    },
    snapshot: () => [...records.values()],
  };
}

type OpenedSourceToolsets = {
  toolsets: Record<string, ToolMap>;
  failures: SourceFailure[];
  recorder: EvidenceRecorder;
  disconnect: () => Promise<void>;
};

export type SourceConnectorDependencies = {
  vectorStore: KnowledgeVectorStore;
  embedQuery: (query: string) => Promise<number[]>;
};

const KNOWLEDGE_MIN_SCORE = 0.35;
const KNOWLEDGE_DEFAULT_TOP_K = 5;
const KNOWLEDGE_MAX_TOP_K = 10;
const KNOWLEDGE_CANDIDATE_MULTIPLIER = 3;

function words(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** Deterministic local rerank: vector relevance plus query-token coverage. */
function rerankKnowledgeHits(query: string, hits: KnowledgeQueryResult[], topK: number) {
  const queryWords = words(query);
  return hits
    .map((hit, position) => {
      const text = typeof hit.metadata?.text === 'string' ? hit.metadata.text : '';
      const textWords = words(text);
      const overlap = queryWords.size
        ? [...queryWords].filter((word) => textWords.has(word)).length / queryWords.size
        : 0;
      return { hit, rank: hit.score * 0.8 + overlap * 0.15 + (1 / (position + 1)) * 0.05 };
    })
    .sort(
      (a, b) => b.rank - a.rank || b.hit.score - a.hit.score || a.hit.id.localeCompare(b.hit.id),
    )
    .slice(0, topK)
    .map(({ hit }) => hit);
}

function knowledgeEvidenceItem(hit: KnowledgeQueryResult) {
  const metadata = hit.metadata ?? {};
  if (
    typeof metadata.text !== 'string' ||
    typeof metadata.documentId !== 'string' ||
    typeof metadata.title !== 'string' ||
    typeof metadata.chunkIndex !== 'number'
  )
    return undefined;
  return {
    text: metadata.text,
    documentId: metadata.documentId,
    documentTitle: metadata.title,
    chunkIndex: metadata.chunkIndex,
    score: hit.score,
  };
}

type KnowledgeEvidenceItem = NonNullable<ReturnType<typeof knowledgeEvidenceItem>>;

function utf8Prefix(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length <= maxBytes) return value;
  let end = Math.max(0, maxBytes);
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString('utf8');
}

function truncateKnowledgeItem(
  item: KnowledgeEvidenceItem,
  maxBytes: number,
): KnowledgeEvidenceItem | undefined {
  let low = 0;
  let high = Buffer.byteLength(item.text, 'utf8');
  let best: KnowledgeEvidenceItem | undefined;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = { ...item, text: utf8Prefix(item.text, middle) };
    if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') <= maxBytes) {
      if (candidate.text) best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}

function boundKnowledgeEvidenceItems(
  items: readonly KnowledgeEvidenceItem[],
  maxBytes: number,
): KnowledgeEvidenceItem[] {
  const bounded: KnowledgeEvidenceItem[] = [];
  let remaining = maxBytes;
  for (const item of items) {
    const serializedBytes = Buffer.byteLength(JSON.stringify(item), 'utf8');
    if (serializedBytes <= remaining) {
      bounded.push(item);
      remaining -= serializedBytes;
      continue;
    }

    const truncated = truncateKnowledgeItem(item, remaining);
    if (truncated) bounded.push(truncated);
    break;
  }
  return bounded;
}

function knowledgeTool(
  source: Extract<ResolvedSource, { transport: 'knowledge' }>,
  deps: SourceConnectorDependencies,
) {
  return new Tool({
    id: 'search',
    description: `Search the selected knowledge base ${source.label} for verbatim document excerpts.`,
    inputSchema: z.object({
      query: z.string().trim().min(1).max(2_000),
      topK: z.number().int().min(1).max(KNOWLEDGE_MAX_TOP_K).default(KNOWLEDGE_DEFAULT_TOP_K),
    }),
    execute: async ({ query, topK = KNOWLEDGE_DEFAULT_TOP_K }) => {
      const queryVector = await deps.embedQuery(query);
      const hits = await deps.vectorStore.query({
        indexName: source.indexName,
        queryVector,
        topK: Math.min(
          KNOWLEDGE_MAX_TOP_K * KNOWLEDGE_CANDIDATE_MULTIPLIER,
          topK * KNOWLEDGE_CANDIDATE_MULTIPLIER,
        ),
        minScore: KNOWLEDGE_MIN_SCORE,
        // Defense in depth: neither index nor metadata filter comes from model input.
        filter: { knowledgeBaseId: String(source.knowledgeBaseId) },
      });
      const items = rerankKnowledgeHits(query, hits, topK)
        .map(knowledgeEvidenceItem)
        .filter((item): item is KnowledgeEvidenceItem => Boolean(item));
      return boundKnowledgeEvidenceItems(items, source.maxResultBytes);
    },
  });
}

function serverConfig(
  source: Exclude<ResolvedSource, { transport: 'knowledge' }>,
): MastraMCPServerDefinition {
  const policy = {
    timeout: source.timeoutMs,
    forwardInstructions: false,
    enableServerLogs: false,
    enableProgressTracking: false,
    onToolError: 'throw' as const,
  };
  if (source.transport === 'stdio') {
    return {
      ...policy,
      command: source.command,
      args: source.args,
      env: source.env,
      stderr: 'pipe',
    };
  }
  return {
    ...policy,
    url: new URL(source.url),
    connectTimeout: Math.min(source.timeoutMs, 10_000),
  };
}

function sourceFailure(
  source: ResolvedSource,
  stage: SourceFailure['stage'],
  error: unknown,
  code: SourceFailure['code'] = 'unknown',
): SourceFailure {
  const raw = error instanceof Error ? error.message : String(error);
  return { sourceId: source.id, stage, code, message: raw.slice(0, 1_000) };
}

function toolFailureCode(error: unknown): SourceFailure['code'] {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|abort/i.test(message)) return 'timeout';
  if (/vector|pgvector|database|connection|offline|unavailable/i.test(message))
    return 'unavailable';
  return 'unknown';
}

type EvidenceProvenance = Pick<Evidence, 'documentId' | 'documentTitle' | 'chunkIndex'>;

function wrapTool(
  source: ResolvedSource,
  advertisedName: string,
  tool: Tool<any, any, any, any>,
  recorder: EvidenceRecorder,
  options: {
    evidenceItems?: (raw: unknown) => unknown[];
    provenance?: (raw: unknown) => EvidenceProvenance;
  } = {},
): Tool<any, any, any, any> {
  if (!tool.execute)
    throw new Error(`Source ${source.id} tool ${advertisedName} is not executable`);
  const execute = tool.execute.bind(tool);
  return new Tool({
    id: tool.id,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: undefined,
    suspendSchema: tool.suspendSchema,
    resumeSchema: tool.resumeSchema,
    requestContextSchema: tool.requestContextSchema,
    requireApproval: tool.requireApproval,
    strict: tool.strict,
    providerOptions: tool.providerOptions,
    mcp: tool.mcp,
    mcpMetadata: tool.mcpMetadata,
    execute: async (input, context) => {
      let raw: unknown;
      try {
        raw = await execute(input, context);
      } catch (error) {
        throw new SourceConnectorError(`Source ${source.id} tool ${advertisedName} failed`, [
          sourceFailure(source, 'tool', error, toolFailureCode(error)),
        ]);
      }

      const rawItems = options.evidenceItems?.(raw) ?? [raw];
      const toolCallId =
        (context as { toolCallId?: string } | undefined)?.toolCallId ??
        `${source.id}:${advertisedName}:${randomUUID()}`;
      const modelItems: unknown[] = [];
      const evidenceIds: string[] = [];
      for (const [itemIndex, rawItem] of rawItems.entries()) {
        let sanitized: ReturnType<typeof sanitizeToolResult>;
        try {
          sanitized = sanitizeToolResult(rawItem, { maxBytes: source.maxResultBytes });
        } catch (error) {
          throw new SourceConnectorError(
            `Source ${source.id} tool ${advertisedName} result could not be sanitized`,
            [sourceFailure(source, 'sanitize', error, 'invalid-result')],
          );
        }
        const itemCallId = rawItems.length === 1 ? toolCallId : `${toolCallId}:${itemIndex}`;
        const id = evidenceId({
          sourceId: source.id,
          toolName: advertisedName,
          toolCallId: itemCallId,
          contentSha256: sanitized.contentSha256,
        });
        recorder.record({
          id,
          sourceId: source.id,
          sourceLabel: source.label,
          claim: sanitized.excerpt,
          excerpt: sanitized.excerpt,
          toolName: advertisedName,
          toolCallId: itemCallId,
          retrievedAt: new Date().toISOString(),
          contentSha256: sanitized.contentSha256,
          url: source.transport === 'http' ? source.url : undefined,
          ...options.provenance?.(rawItem),
        });
        evidenceIds.push(id);
        modelItems.push(sanitized.data);
      }
      return {
        evidenceId: evidenceIds[0],
        evidenceIds,
        sourceId: source.id,
        toolName: advertisedName,
        trust: 'untrusted-source-data',
        data: options.evidenceItems ? modelItems : modelItems[0],
      };
    },
  });
}

async function openOneSource(
  source: ResolvedSource,
  recorder: EvidenceRecorder,
  dependencies: Partial<SourceConnectorDependencies>,
): Promise<{
  tools?: ToolMap;
  failure?: SourceFailure;
  disconnect: () => Promise<void>;
}> {
  if (source.transport === 'knowledge') {
    const deps: SourceConnectorDependencies = {
      vectorStore: dependencies.vectorStore ?? knowledgeVectorStore(),
      embedQuery: dependencies.embedQuery ?? embedKnowledgeQuery,
    };
    const tool = knowledgeTool(source, deps);
    return {
      tools: {
        search: wrapTool(source, 'search', tool, recorder, {
          evidenceItems: (raw) => (Array.isArray(raw) ? raw : []),
          provenance: (raw) => {
            const item = raw as {
              documentId?: unknown;
              documentTitle?: unknown;
              chunkIndex?: unknown;
            };
            return {
              documentId: typeof item.documentId === 'string' ? item.documentId : undefined,
              documentTitle:
                typeof item.documentTitle === 'string' ? item.documentTitle : undefined,
              chunkIndex: typeof item.chunkIndex === 'number' ? item.chunkIndex : undefined,
            };
          },
        }),
      },
      disconnect: async () => {},
    };
  }
  const client = new MCPClient({
    id: `agent-source-${source.id}-${randomUUID()}`,
    servers: { [source.id]: serverConfig(source) },
  });
  try {
    const { toolsets, errors } = await client.listToolsetsWithErrors();
    if (errors[source.id]) {
      return {
        failure: sourceFailure(source, 'discover', errors[source.id], 'unavailable'),
        disconnect: () => client.disconnect(),
      };
    }
    const advertised = toolsets[source.id] ?? {};
    const missing = source.allowedTools.filter((name) => !(name in advertised));
    if (missing.length) {
      return {
        failure: sourceFailure(
          source,
          'policy',
          `Source did not advertise allowed tool(s): ${missing.join(', ')}`,
          'disallowed-tool',
        ),
        disconnect: () => client.disconnect(),
      };
    }
    return {
      tools: Object.fromEntries(
        source.allowedTools.map((name) => [
          name,
          wrapTool(source, name, advertised[name]!, recorder),
        ]),
      ),
      disconnect: () => client.disconnect(),
    };
  } catch (error) {
    return {
      failure: sourceFailure(source, 'connect', error, 'unavailable'),
      disconnect: () => client.disconnect(),
    };
  }
}

export async function openSourceToolsets(
  sources: readonly ResolvedSource[],
  dependencies: Partial<SourceConnectorDependencies> = {},
): Promise<OpenedSourceToolsets> {
  const recorder = createEvidenceRecorder();
  if (sources.length === 0) {
    return { toolsets: {}, failures: [], recorder, disconnect: async () => {} };
  }

  const opened = await Promise.all(
    sources.map((source) => openOneSource(source, recorder, dependencies)),
  );
  const failures = opened.flatMap((item) => (item.failure ? [item.failure] : []));
  const strictFailure = failures.find(
    (failure) => sources.find((source) => source.id === failure.sourceId)?.failureMode === 'strict',
  );
  if (strictFailure) {
    await Promise.allSettled(opened.map((item) => item.disconnect()));
    throw new SourceConnectorError(
      `Source ${strictFailure.sourceId} ${strictFailure.stage} failed: ${strictFailure.message}`,
      failures,
    );
  }

  let disconnected = false;
  return {
    toolsets: Object.fromEntries(
      opened.flatMap((item, index) => (item.tools ? [[sources[index]!.id, item.tools]] : [])),
    ),
    failures,
    recorder,
    disconnect: async () => {
      if (disconnected) return;
      disconnected = true;
      await Promise.allSettled(opened.map((item) => item.disconnect()));
    },
  };
}
