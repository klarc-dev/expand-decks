import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authenticateRequest, executeSlideLayoutCommand } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  executeSlideLayoutCommand: vi.fn(),
}));

vi.mock('@/lib/authenticateRequest', () => ({ authenticateRequest }));
vi.mock('@/lib/slideLayoutChange', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/slideLayoutChange')>();
  return { ...original, executeSlideLayoutCommand };
});

import { POST } from '../route';

function request(body: unknown) {
  return new Request('http://localhost/api/slide-layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

describe('POST /api/slide-layout', () => {
  beforeEach(() => {
    authenticateRequest.mockReset();
    executeSlideLayoutCommand.mockReset();
    authenticateRequest.mockResolvedValue({ payload: { id: 'payload' }, user: { id: 7 } });
  });

  it('is the canonical authenticated REST boundary for layout commands', async () => {
    const command = { action: 'analyze', deckId: 42, slideIndex: 1 };
    executeSlideLayoutCommand.mockResolvedValue({ action: 'analyze', compatibility: [] });

    const response = await POST(request(command));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ action: 'analyze', compatibility: [] });
    expect(executeSlideLayoutCommand).toHaveBeenCalledWith({
      command,
      payload: { id: 'payload' },
      user: { id: 7 },
    });
  });

  it('rejects unauthenticated and invalid requests before command execution', async () => {
    authenticateRequest.mockResolvedValueOnce({ payload: {}, user: null });
    expect((await POST(request({ action: 'analyze', deckId: 42, slideIndex: 1 }))).status).toBe(
      401,
    );

    authenticateRequest.mockResolvedValueOnce({ payload: {}, user: { id: 7 } });
    expect((await POST(request({ action: 'apply' }))).status).toBe(400);
    expect(executeSlideLayoutCommand).not.toHaveBeenCalled();
  });
});
