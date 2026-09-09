import { afterEach, describe, expect, it, vi } from 'vitest';

import { deckMcpTools } from '../deckServer';

const execute = (tool: keyof typeof deckMcpTools, input: Record<string, unknown>) =>
  deckMcpTools[tool].execute?.({ command: input } as never, {} as never);

const ok = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('composite deck MCP tools', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('exposes exactly one composite tool per domain', () => {
    expect(Object.keys(deckMcpTools)).toEqual(['deck', 'slide', 'deck_workflow', 'media_producer']);
  });

  it.each([
    ['list', { action: 'list' }, 'GET', '/api/presentations?depth=0&limit=100', undefined],
    ['get', { action: 'get', deckId: 42 }, 'GET', '/api/presentations/42?depth=0', undefined],
    [
      'create',
      { action: 'create', title: 'New deck', organisation: 7 },
      'POST',
      '/api/presentations',
      { title: 'New deck', organisation: 7 },
    ],
    [
      'update',
      { action: 'update', deckId: 42, data: { title: 'Renamed' } },
      'PATCH',
      '/api/presentations/42',
      { title: 'Renamed' },
    ],
    ['delete', { action: 'delete', deckId: 42 }, 'DELETE', '/api/presentations/42', undefined],
    ['build', { action: 'build', deckId: 42 }, 'POST', '/api/presentations/42/build', {}],
    ['sources', { action: 'sources' }, 'GET', '/api/agent-sources', undefined],
  ] as const)(
    'deck:%s delegates to the canonical app API',
    async (_action, input, method, path, body) => {
      const fetchSpy = vi.fn().mockResolvedValue(ok());
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubEnv('DECK_API_URL', 'https://decks.example');
      vi.stubEnv('DECK_API_KEY', 'secret');

      await execute('deck', input);

      expect(fetchSpy).toHaveBeenCalledWith(`https://decks.example${path}`, {
        method,
        headers: {
          Authorization: 'users API-Key secret',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    },
  );

  it.each([
    ['list', { action: 'list', deckId: 42 }, 'GET', '/api/deck-slides?deckId=42', undefined],
    [
      'get',
      { action: 'get', deckId: 42, slideIndex: 1 },
      'GET',
      '/api/deck-slides?deckId=42&slideIndex=1',
      undefined,
    ],
    [
      'create',
      { action: 'create', deckId: 42, index: 1, slide: { blockType: 'statement', title: 'Point' } },
      'POST',
      '/api/deck-slides',
      { action: 'create', deckId: 42, index: 1, slide: { blockType: 'statement', title: 'Point' } },
    ],
    [
      'update',
      {
        action: 'update',
        deckId: 42,
        slideIndex: 1,
        slide: { blockType: 'statement', title: 'Updated' },
      },
      'POST',
      '/api/deck-slides',
      {
        action: 'update',
        deckId: 42,
        slideIndex: 1,
        slide: { blockType: 'statement', title: 'Updated' },
      },
    ],
    [
      'delete',
      { action: 'delete', deckId: 42, slideIndex: 1 },
      'POST',
      '/api/deck-slides',
      { action: 'delete', deckId: 42, slideIndex: 1 },
    ],
    [
      'move',
      { action: 'move', deckId: 42, slideIndex: 1, toIndex: 3 },
      'POST',
      '/api/deck-slides',
      { action: 'move', deckId: 42, slideIndex: 1, toIndex: 3 },
    ],
    [
      'revise',
      { action: 'revise', deckId: 42, slideIndex: 1, instruction: 'Make it shorter' },
      'POST',
      '/api/revise-slide',
      { presentationId: 42, slideIndex: 1, instruction: 'Make it shorter' },
    ],
  ] as const)(
    'slide:%s delegates to the canonical app API',
    async (_action, input, method, path, body) => {
      const fetchSpy = vi.fn().mockResolvedValue(ok());
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubEnv('DECK_API_URL', 'https://decks.example');
      vi.stubEnv('DECK_API_KEY', 'secret');

      await execute('slide', input);

      expect(fetchSpy).toHaveBeenCalledWith(`https://decks.example${path}`, {
        method,
        headers: {
          Authorization: 'users API-Key secret',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    },
  );

  it.each([
    [
      'capabilities',
      { action: 'capabilities' },
      'GET',
      '/api/media-producer/capabilities',
      undefined,
    ],
    [
      'request',
      {
        action: 'request',
        request: {
          contract: 'expand-decks.media-request/1.0',
          publication_id: 'publication-1',
          revision_sha256: 'a'.repeat(64),
          producer: 'expand-decks',
          intended_format: 'linkedin_document_carousel',
          copy_relationship: 'accompanies_caption',
          title: 'A document',
          language: 'fr',
          organisation_id: 7,
          pages: [
            { order: 1, block: { blockType: 'statement', title: 'Point' }, alt_text: 'Point' },
            {
              order: 2,
              block: { blockType: 'statement', title: 'Second' },
              alt_text: 'Second',
            },
          ],
          accessibility: { reading_order_required: true, minimum_body_px: null },
          constraints: {
            delivery_pdf: { media_type: 'application/pdf', max_bytes: null, max_pages: null },
            transport_images: {
              media_type: 'image/png',
              max_bytes_each: 10 * 1024 * 1024,
              minimum_count: 2,
            },
          },
        },
      },
      'POST',
      '/api/media-producer/requests',
      'request',
    ],
    [
      'status',
      { action: 'status', requestId: 'request/1' },
      'GET',
      '/api/media-producer/requests/request%2F1',
      undefined,
    ],
  ] as const)(
    'media_producer:%s delegates to the canonical app API',
    async (_action, input, method, path, bodyKey) => {
      const fetchSpy = vi.fn().mockResolvedValue(ok());
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubEnv('DECK_API_URL', 'https://decks.example');
      vi.stubEnv('DECK_API_KEY', 'secret');

      await execute('media_producer', input);

      const bodyValue = bodyKey ? (input as { request: unknown }).request : undefined;
      expect(fetchSpy).toHaveBeenCalledWith(`https://decks.example${path}`, {
        method,
        headers: {
          Authorization: 'users API-Key secret',
          ...(bodyValue === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(bodyValue === undefined ? {} : { body: JSON.stringify(bodyValue) }),
      });
    },
  );
});
