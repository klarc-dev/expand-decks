import { afterEach, describe, expect, it, vi } from 'vitest';

import { deckMcpTools } from '../deckServer';

const ok = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('composite deck workflow MCP tool', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts durable builds through the canonical agent-draft API', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(ok({ started: true, runId: 'run-1', status: 'queued' }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('DECK_API_URL', 'https://decks.example/');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await expect(
      deckMcpTools.deck_workflow.execute?.(
        {
          command: {
            action: 'start',
            presentationId: 42,
            brief: 'Build a concise strategy presentation.',
            mode: 'replace',
            visual: true,
            approvalRequired: false,
          },
        },
        {} as never,
      ),
    ).resolves.toMatchObject({ runId: 'run-1', status: 'queued' });
    expect(fetchSpy).toHaveBeenCalledWith('https://decks.example/api/agent-draft', {
      method: 'POST',
      headers: {
        Authorization: 'users API-Key secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        presentationId: 42,
        brief: 'Build a concise strategy presentation.',
        mode: 'replace',
        visual: true,
        approvalRequired: false,
      }),
    });
  });

  it('gets workflow status', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ runId: 'run/1', status: 'running' }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('DECK_API_URL', 'https://decks.example');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await deckMcpTools.deck_workflow.execute?.(
      { command: { action: 'status', runId: 'run/1' } },
      {} as never,
    );

    expect(fetchSpy).toHaveBeenCalledWith('https://decks.example/api/agent-draft/run%2F1', {
      method: 'GET',
      headers: { Authorization: 'users API-Key secret' },
    });
  });

  it('uses workflow actions for resume, cancel, restart, and time travel', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ runId: 'run/1', status: 'canceled' }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('DECK_API_URL', 'https://decks.example');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await deckMcpTools.deck_workflow.execute?.(
      { command: { action: 'cancel', runId: 'run/1' } },
      {} as never,
    );

    expect(fetchSpy).toHaveBeenCalledWith('https://decks.example/api/agent-draft/run%2F1', {
      method: 'POST',
      headers: {
        Authorization: 'users API-Key secret',
        'Content-Type': 'application/json',
      },
      body: '{"action":"cancel"}',
    });
  });

  it('surfaces API failures instead of returning false success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Accès refusé' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    vi.stubEnv('DECK_API_URL', 'https://decks.example');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await expect(
      deckMcpTools.deck_workflow.execute?.(
        { command: { action: 'status', runId: 'run-1' } },
        {} as never,
      ),
    ).rejects.toThrow('Deck API 403: Accès refusé');
  });
});
