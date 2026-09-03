import { randomUUID } from 'node:crypto';

import { Tool } from '@mastra/core/tools';
import { MCPClient, type MastraMCPServerDefinition } from '@mastra/mcp';

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
  return /timeout|timed out|abort/i.test(message) ? 'timeout' : 'unknown';
}

function wrapTool(
  source: ResolvedSource,
  advertisedName: string,
  tool: Tool<any, any, any, any>,
  recorder: EvidenceRecorder,
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

      let sanitized: ReturnType<typeof sanitizeToolResult>;
      try {
        sanitized = sanitizeToolResult(raw, {
          maxBytes: source.maxResultBytes,
        });
      } catch (error) {
        throw new SourceConnectorError(
          `Source ${source.id} tool ${advertisedName} result could not be sanitized`,
          [sourceFailure(source, 'sanitize', error, 'invalid-result')],
        );
      }
      const toolCallId =
        (context as { toolCallId?: string } | undefined)?.toolCallId ??
        `${source.id}:${advertisedName}:${randomUUID()}`;
      const id = evidenceId({
        sourceId: source.id,
        toolName: advertisedName,
        toolCallId,
        contentSha256: sanitized.contentSha256,
      });
      const evidence: Evidence = {
        id,
        sourceId: source.id,
        sourceLabel: source.label,
        claim: sanitized.excerpt,
        excerpt: sanitized.excerpt,
        toolName: advertisedName,
        toolCallId,
        retrievedAt: new Date().toISOString(),
        contentSha256: sanitized.contentSha256,
        url: source.transport === 'http' ? source.url : undefined,
      };
      recorder.record(evidence);
      return {
        evidenceId: id,
        sourceId: source.id,
        toolName: advertisedName,
        trust: sanitized.trust,
        data: sanitized.data,
      };
    },
  });
}

async function openOneSource(
  source: ResolvedSource,
  recorder: EvidenceRecorder,
): Promise<{
  tools?: ToolMap;
  failure?: SourceFailure;
  disconnect: () => Promise<void>;
}> {
  if (source.transport === 'knowledge') {
    return {
      failure: sourceFailure(
        source,
        'connect',
        'Knowledge source search is not available until ticket #17',
        'unavailable',
      ),
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
): Promise<OpenedSourceToolsets> {
  const recorder = createEvidenceRecorder();
  if (sources.length === 0) {
    return { toolsets: {}, failures: [], recorder, disconnect: async () => {} };
  }

  const opened = await Promise.all(sources.map((source) => openOneSource(source, recorder)));
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
