import { randomUUID } from 'node:crypto';

import { MCPClient } from '@mastra/mcp';

import type { ResolvedSource, SourceDescriptor } from './types';

type MCPServerConfig =
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { url: URL };

type OpenedSourceToolsets = {
  toolsets: unknown;
  disconnect: () => Promise<void>;
};

function serverConfig(source: SourceDescriptor): MCPServerConfig {
  if (source.transport === 'stdio') {
    return {
      command: source.command,
      args: source.args,
      env: source.env,
    };
  }
  return { url: new URL(source.url) };
}

function timeoutFor(sources: ResolvedSource[]): number | undefined {
  const timeouts = sources.map((source) => source.timeoutMs).filter((v): v is number => !!v);
  return timeouts.length ? Math.max(...timeouts) : undefined;
}

export async function openSourceToolsets(
  sources: readonly ResolvedSource[],
): Promise<OpenedSourceToolsets> {
  if (sources.length === 0) {
    return { toolsets: {}, disconnect: async () => {} };
  }

  const servers = Object.fromEntries(
    sources.map((source) => [source.id, serverConfig(source)]),
  ) as Record<string, MCPServerConfig>;

  const client = new MCPClient({
    id: `agent-sources-${randomUUID()}`,
    servers: servers as never,
    timeout: timeoutFor([...sources]),
  });

  try {
    const toolsets = await client.listToolsets();
    return {
      toolsets,
      disconnect: async () => {
        await client.disconnect();
      },
    };
  } catch (error) {
    await client.disconnect().catch(() => {});
    throw error;
  }
}
