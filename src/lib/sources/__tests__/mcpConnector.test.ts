import { beforeEach, describe, expect, it, vi } from 'vitest';

const listToolsets = vi.fn();
const disconnect = vi.fn();
const ctor = vi.fn();

vi.mock('@mastra/mcp', () => ({
  MCPClient: vi.fn().mockImplementation(function MCPClient(opts) {
    ctor(opts);
    return { listToolsets, disconnect };
  }),
}));

import { openSourceToolsets } from '../mcpConnector';
import type { ResolvedSource } from '../types';

const httpSource: ResolvedSource = {
  id: 'web-docs',
  label: 'Web Docs',
  transport: 'http',
  url: 'https://example.com/mcp',
  timeoutMs: 30_000,
} as ResolvedSource;

const stdioSource: ResolvedSource = {
  id: 'fiscal-kb',
  label: 'Fiscal KB',
  transport: 'stdio',
  command: 'node',
  args: ['server.js'],
  env: { API_KEY: 'secret' },
  timeoutMs: 60_000,
} as ResolvedSource;

beforeEach(() => {
  listToolsets.mockReset();
  disconnect.mockReset();
  disconnect.mockResolvedValue(undefined);
  ctor.mockReset();
});

describe('openSourceToolsets', () => {
  it('returns empty toolsets without constructing a client for no sources', async () => {
    const { toolsets, disconnect: dc } = await openSourceToolsets([]);
    expect(toolsets).toEqual({});
    await dc();
    expect(ctor).not.toHaveBeenCalled();
  });

  it('constructs one server entry per source and returns toolsets', async () => {
    listToolsets.mockResolvedValue({ 'web-docs': {}, 'fiscal-kb': {} });
    const { toolsets } = await openSourceToolsets([httpSource, stdioSource]);

    expect(ctor).toHaveBeenCalledTimes(1);
    const opts = ctor.mock.calls[0]![0] as {
      id?: string;
      servers: Record<string, unknown>;
      timeout?: number;
    };
    expect(opts.id).toMatch(/^agent-sources-/);
    expect(Object.keys(opts.servers)).toEqual(['web-docs', 'fiscal-kb']);
    expect(opts.timeout).toBe(60_000);
    expect(toolsets).toMatchObject({ 'web-docs': {}, 'fiscal-kb': {} });
  });

  it('gives each open a distinct client id so concurrent runs do not collide', async () => {
    listToolsets.mockResolvedValue({ 'web-docs': {} });
    await openSourceToolsets([httpSource]);
    await openSourceToolsets([httpSource]);

    const firstId = (ctor.mock.calls[0]![0] as { id: string }).id;
    const secondId = (ctor.mock.calls[1]![0] as { id: string }).id;
    expect(firstId).not.toBe(secondId);
  });

  it('disconnects when listing toolsets throws', async () => {
    listToolsets.mockRejectedValue(new Error('boom'));
    await expect(openSourceToolsets([httpSource])).rejects.toThrow('boom');
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
