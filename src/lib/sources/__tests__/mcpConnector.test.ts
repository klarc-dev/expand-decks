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
import { SourceConnectorError, type ResolvedSource } from '../types';

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
  new Tool({
    id: 'search',
    description: 'search',
    execute: async () => result,
  });

const throwingTool = (error: Error) =>
  new Tool({
    id: 'search',
    description: 'search',
    execute: async () => {
      throw error;
    },
  });

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

  it('searches a knowledge base with a server-enforced index/filter and captures verbatim provenance', async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: 'chunk-1',
        score: 0.82,
        metadata: {
          knowledgeBaseId: '42',
          documentId: '9',
          title: 'Contrat cadre',
          chunkIndex: 3,
          text: '  Clause résolutoire verbatim.  ',
        },
      },
    ]);
    const opened = await openSourceToolsets(
      [
        source({
          id: 'knowledge_42',
          label: 'Contrats',
          transport: 'knowledge',
          knowledgeBaseId: 42,
          indexName: 'knowledge_42',
        } as Partial<ResolvedSource>),
      ],
      { vectorStore: { query }, embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)) },
    );

    const result = await opened.toolsets.knowledge_42!.search!.execute?.(
      {
        query: 'clause résolutoire',
        topK: 10,
        indexName: 'evil',
        filter: { knowledgeBaseId: '7' },
      },
      { toolCallId: 'kb-call' } as never,
    );

    expect(query).toHaveBeenCalledWith({
      indexName: 'knowledge_42',
      queryVector: Array(384).fill(0.1),
      topK: 30,
      minScore: 0.35,
      filter: { knowledgeBaseId: '42' },
    });
    expect(result).toMatchObject({
      sourceId: 'knowledge_42',
      data: [expect.objectContaining({ text: '  Clause résolutoire verbatim.  ' })],
    });
    expect(opened.recorder.snapshot()).toEqual([
      expect.objectContaining({
        sourceId: 'knowledge_42',
        excerpt: '  Clause résolutoire verbatim.  ',
        documentId: '9',
        documentTitle: 'Contrat cadre',
        chunkIndex: 3,
        contentSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
    expect(ctor).not.toHaveBeenCalled();
  });

  it('applies one aggregate byte budget across knowledge excerpts', async () => {
    const maxResultBytes = 450;
    const query = vi.fn().mockResolvedValue(
      ['alpha', 'beta', 'gamma'].map((label, index) => ({
        id: `chunk-${index}`,
        score: 0.9 - index * 0.1,
        metadata: {
          knowledgeBaseId: '42',
          documentId: String(index + 1),
          title: `Document ${label}`,
          chunkIndex: index,
          text: `${label} ${'é'.repeat(100)}`,
        },
      })),
    );
    const opened = await openSourceToolsets(
      [
        source({
          id: 'knowledge_42',
          label: 'Contrats',
          transport: 'knowledge',
          knowledgeBaseId: 42,
          indexName: 'knowledge_42',
          maxResultBytes,
        } as Partial<ResolvedSource>),
      ],
      { vectorStore: { query }, embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)) },
    );

    const result = (await opened.toolsets.knowledge_42!.search!.execute?.(
      { query: 'documents', topK: 3 },
      { toolCallId: 'budget-call' } as never,
    )) as { data: Array<{ text: string }> };
    const evidence = opened.recorder.snapshot();

    expect(result.data).toHaveLength(2);
    expect(evidence).toHaveLength(2);
    expect(result.data[0]!.text).toBe(`alpha ${'é'.repeat(100)}`);
    expect(result.data[1]!.text.startsWith('beta ')).toBe(true);
    expect(result.data[1]!.text.length).toBeLessThan(`beta ${'é'.repeat(100)}`.length);
    expect(result.data.map((item) => item.text)).toEqual(evidence.map((item) => item.excerpt));
    expect(Buffer.byteLength(JSON.stringify(result.data), 'utf8')).toBeLessThanOrEqual(
      maxResultBytes,
    );
    expect(Buffer.from(result.data[1]!.text, 'utf8').toString('utf8')).toBe(result.data[1]!.text);
    expect(result.data.some((item) => item.text.startsWith('gamma '))).toBe(false);
  });

  it('captures no evidence when a knowledge search returns no excerpts', async () => {
    const opened = await openSourceToolsets(
      [
        source({
          id: 'knowledge_42',
          transport: 'knowledge',
          knowledgeBaseId: 42,
          indexName: 'knowledge_42',
        } as Partial<ResolvedSource>),
      ],
      {
        vectorStore: { query: vi.fn().mockResolvedValue([]) },
        embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
      },
    );
    const result = await opened.toolsets.knowledge_42!.search!.execute?.(
      { query: 'absent' },
      {} as never,
    );
    expect(result).toMatchObject({ data: [], evidenceIds: [] });
    expect(opened.recorder.snapshot()).toEqual([]);
  });

  it('wraps knowledge vector failures as unavailable source failures', async () => {
    const opened = await openSourceToolsets(
      [
        source({
          id: 'knowledge_42',
          transport: 'knowledge',
          knowledgeBaseId: 42,
          indexName: 'knowledge_42',
        } as Partial<ResolvedSource>),
      ],
      {
        vectorStore: { query: vi.fn().mockRejectedValue(new Error('pgvector offline')) },
        embedQuery: vi.fn().mockResolvedValue(Array(384).fill(0.1)),
      },
    );
    await expect(
      opened.toolsets.knowledge_42!.search!.execute?.({ query: 'x' }, {} as never),
    ).rejects.toMatchObject({
      failures: [
        expect.objectContaining({ sourceId: 'knowledge_42', stage: 'tool', code: 'unavailable' }),
      ],
    });
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
    expect(result).toMatchObject({
      evidenceId: expect.stringMatching(/^ev_/),
      sourceId: 'docs',
    });
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

  it('wraps tool execution errors as bounded structured failures', async () => {
    discovery.push({
      toolsets: { docs: { search: throwingTool(new Error(`timeout ${'x'.repeat(2_000)}`)) } },
      errors: {},
    });
    const opened = await openSourceToolsets([source()]);

    const failure = await opened.toolsets
      .docs!.search!.execute?.({}, {} as never)
      .catch((error) => error);
    expect(failure).toBeInstanceOf(SourceConnectorError);
    expect(failure).toMatchObject({
      failures: [expect.objectContaining({ sourceId: 'docs', stage: 'tool', code: 'timeout' })],
    });
    expect(failure.failures[0].message).toHaveLength(1_000);
  });

  it('wraps sanitization errors as invalid-result failures', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    discovery.push({ toolsets: { docs: { search: rawTool(circular) } }, errors: {} });
    const opened = await openSourceToolsets([source()]);

    await expect(opened.toolsets.docs!.search!.execute?.({}, {} as never)).rejects.toMatchObject({
      failures: [
        expect.objectContaining({
          sourceId: 'docs',
          stage: 'sanitize',
          code: 'invalid-result',
        }),
      ],
    });
  });

  it('fails closed for strict discovery failure with structured failures', async () => {
    discovery.push({ toolsets: {}, errors: { docs: 'offline' } });
    const failure = await openSourceToolsets([source()]).catch((error) => error);
    expect(failure).toBeInstanceOf(SourceConnectorError);
    expect(failure).toMatchObject({
      failures: [
        expect.objectContaining({
          sourceId: 'docs',
          stage: 'discover',
          code: 'unavailable',
          message: 'offline',
        }),
      ],
    });
    expect(clients[0]!.disconnect).toHaveBeenCalled();
  });

  it('returns explicit failures for best-effort discovery errors', async () => {
    discovery.push({ toolsets: {}, errors: { docs: 'offline' } });
    const opened = await openSourceToolsets([source({ failureMode: 'best-effort' })]);
    expect(opened.toolsets).toEqual({});
    expect(opened.failures).toEqual([
      expect.objectContaining({
        sourceId: 'docs',
        stage: 'discover',
        code: 'unavailable',
      }),
    ]);
  });
});
