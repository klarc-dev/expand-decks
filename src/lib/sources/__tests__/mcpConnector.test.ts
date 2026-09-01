import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Tool } from '@mastra/core/tools';

const clients: Array<{
  listToolsetsWithErrors: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];
const discovery: unknown[] = [];
const ctor = vi.fn();

vi.mock('@mastra/mcp', () => ({
  MCPClient: vi.fn().mockImplementation(function MCPClient(opts) {
    ctor(opts);
    const client = {
      listToolsetsWithErrors: vi.fn().mockImplementation(async () => discovery.shift()),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    clients.push(client);
    return client;
  }),
}));

import { openSourceToolsets } from '../mcpConnector';
import type { ResolvedSource } from '../types';

const source = (overrides: Partial<ResolvedSource> = {}): ResolvedSource =>
  ({
    id: 'docs',
    label: 'Docs',
    allowedTools: ['search'],
    failureMode: 'strict',
    toolCallConcurrency: 2,
    maxResultBytes: 100_000,
    transport: 'http',
    url: 'https://example.com/mcp',
    timeoutMs: 30_000,
    ...overrides,
  }) as ResolvedSource;

const rawTool = (result: unknown) =>
  new Tool({ id: 'search', description: 'search', execute: async () => result });

beforeEach(() => {
  clients.length = 0;
  discovery.length = 0;
  ctor.mockReset();
});

describe('openSourceToolsets', () => {
  it('returns empty toolsets without clients for no sources', async () => {
    const opened = await openSourceToolsets([]);
    expect(opened.toolsets).toEqual({});
    expect(ctor).not.toHaveBeenCalled();
  });

  it('constructs one isolated client per source with per-source security policy', async () => {
    discovery.push(
      { toolsets: { docs: { search: rawTool('a') } }, errors: {} },
      { toolsets: { kb: { search: rawTool('b') } }, errors: {} },
    );
    const opened = await openSourceToolsets([
      source(),
      source({ id: 'kb', label: 'KB', timeoutMs: 60_000 }),
    ]);

    expect(ctor).toHaveBeenCalledTimes(2);
    expect(ctor.mock.calls[0]![0].servers.docs).toMatchObject({
      timeout: 30_000,
      forwardInstructions: false,
      onToolError: 'throw',
    });
    expect(ctor.mock.calls[1]![0].servers.kb.timeout).toBe(60_000);
    expect(Object.keys(opened.toolsets)).toEqual(['docs', 'kb']);
  });

  it('records stable evidence only after a real successful tool execution', async () => {
    discovery.push({
      toolsets: {
        docs: {
          search: rawTool({ text: 'Verified result', apiKey: 'secret' }),
          delete: rawTool('must not be exposed'),
        },
      },
      errors: {},
    });
    const opened = await openSourceToolsets([source()]);
    expect(Object.keys(opened.toolsets.docs!)).toEqual(['search']);
    expect(opened.recorder.snapshot()).toEqual([]);

    const result = await opened.toolsets.docs!.search!.execute?.({}, {
      toolCallId: 'call-1',
    } as never);
    expect(result).toMatchObject({ evidenceId: expect.stringMatching(/^ev_/), sourceId: 'docs' });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(opened.recorder.snapshot()).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^ev_/),
        sourceId: 'docs',
        toolName: 'search',
        toolCallId: 'call-1',
        excerpt: 'Verified result',
      }),
    ]);
  });

  it('fails closed for strict discovery failure', async () => {
    discovery.push({ toolsets: {}, errors: { docs: 'offline' } });
    await expect(openSourceToolsets([source()])).rejects.toThrow(/docs.*offline/);
    expect(clients[0]!.disconnect).toHaveBeenCalled();
  });

  it('returns explicit failures for best-effort discovery errors', async () => {
    discovery.push({ toolsets: {}, errors: { docs: 'offline' } });
    const opened = await openSourceToolsets([source({ failureMode: 'best-effort' })]);
    expect(opened.toolsets).toEqual({});
    expect(opened.failures).toEqual([
      expect.objectContaining({ sourceId: 'docs', stage: 'discover', code: 'unavailable' }),
    ]);
  });
});
