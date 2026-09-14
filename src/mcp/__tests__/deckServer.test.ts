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

  it('refuses a deck update while an agent run owns the deck', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ id: 42, draftStatus: 'drafting' }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('DECK_API_URL', 'https://decks.example');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await expect(
      deckMcpTools.deck.execute?.(
        { command: { action: 'update', deckId: 42, data: { title: 'New' } } },
        {} as never,
      ),
    ).rejects.toThrow(/running agent build/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('updates a deck that no run owns', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(ok({ id: 42, draftStatus: 'done' }))
      .mockResolvedValueOnce(ok({ id: 42, title: 'New' }));
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('DECK_API_URL', 'https://decks.example');
    vi.stubEnv('DECK_API_KEY', 'secret');

    await expect(
      deckMcpTools.deck.execute?.(
        { command: { action: 'update', deckId: 42, data: { title: 'New' } } },
        {} as never,
      ),
    ).resolves.toMatchObject({ title: 'New' });
    expect(fetchSpy).toHaveBeenLastCalledWith(
      'https://decks.example/api/presentations/42',
      expect.objectContaining({ method: 'PATCH', body: '{"title":"New"}' }),
    );
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
