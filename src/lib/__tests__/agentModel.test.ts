import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('../ai', () => ({
  forceNonStreamFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));

const { agentModelSchema, verifyAgentModel, withAgentModel, activeAgentModel } = await import(
  '../agentModel'
);

beforeEach(() => {
  vi.stubEnv('CLIPROXYAPI_BASE_URL', 'https://proxy.example/v1');
  vi.stubEnv('CLIPROXYAPI_KEY', 'test-key');
});

afterEach(() => vi.unstubAllEnvs());

describe('agent model selection', () => {
  it('accepts proxy aliases and concrete model identifiers', () => {
    expect(agentModelSchema.parse(' high ')).toBe('high');
    expect(agentModelSchema.parse('anthropic/claude-opus-5')).toBe('anthropic/claude-opus-5');
    expect(agentModelSchema.safeParse('bad model').success).toBe(false);
  });

  it('scopes a selected model to one durable run', async () => {
    expect(activeAgentModel()).toBeUndefined();
    await withAgentModel('medium', async () => {
      expect(activeAgentModel()).toBe('medium');
      await Promise.resolve();
      expect(activeAgentModel()).toBe('medium');
    });
    expect(activeAgentModel()).toBeUndefined();
  });

  it('verifies a real forced tool call through CloudCLIProxy', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: 'claude-opus-5',
          choices: [
            {
              message: {
                tool_calls: [
                  { function: { name: 'verify', arguments: JSON.stringify({ ok: true }) } },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await verifyAgentModel('high');

    expect(result).toEqual({ model: 'high', resolvedModel: 'claude-opus-5' });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(fetchMock.mock.calls[0]![0]).toBe('https://proxy.example/v1/chat/completions');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('high');
    expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'verify' } });
  });

  it('reports gateway errors without leaking the authorization header', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'unknown model' } }), { status: 404 }),
    );

    await expect(verifyAgentModel('missing-model')).rejects.toThrow('unknown model');
  });

  it('requires the canonical CloudCLIProxy environment pair', async () => {
    vi.stubEnv('CLIPROXYAPI_BASE_URL', '');
    await expect(verifyAgentModel('high')).rejects.toThrow('URL CloudCLIProxy absente');
    vi.stubEnv('CLIPROXYAPI_BASE_URL', 'https://proxy.example/v1');
    vi.stubEnv('CLIPROXYAPI_KEY', '');
    await expect(verifyAgentModel('high')).rejects.toThrow('Clé CloudCLIProxy absente');
  });
});
