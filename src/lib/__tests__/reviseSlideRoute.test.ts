import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/(payload)/api/revise-slide/route';

const { findByID, update, execute, user } = vi.hoisted(() => ({
  findByID: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  user: { id: 1, role: 'author', membershipStatus: 'active', organisations: [2] },
}));
vi.mock('@/lib/authenticateRequest', () => ({
  authenticateRequest: async () => ({ payload: { findByID, update, db: { execute } }, user }),
}));
vi.mock('@/lib/payloadTransaction', () => ({
  PayloadTransactionUnavailable: class extends Error {},
  withPayloadTransaction: async (
    _payload: unknown,
    req: unknown,
    callback: (req: unknown, db: object) => Promise<unknown>,
  ) => callback(req, {}),
}));
vi.mock('@/lib/currentDeckContext', () => ({ currentSlideContext: async () => '{}' }));
vi.mock('@/agents/reviseSlide', () => ({
  reviseSlide: async () => ({ blockType: 'cover', title: 'Revised' }),
}));
vi.mock('@/lib/richTextWrite', () => ({
  convertSlidesMarkdownToLexical: async (slides: unknown) => slides,
}));

const original = {
  id: 3,
  organisation: 2,
  documentTemplate: 'presentation',
  slides: [
    { id: 'stable-cover', blockType: 'cover', title: 'First' },
    { id: 'stable-section', blockType: 'section', title: 'Second' },
  ],
};

function revise() {
  return POST(
    new NextRequest('http://localhost/api/revise-slide', {
      method: 'POST',
      body: JSON.stringify({ presentationId: 3, slideIndex: 0, instruction: 'Simplify wording' }),
    }),
  );
}

describe('native slide revision save', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findByID.mockResolvedValueOnce(original);
  });

  it('does not write when another call changed the deck during model generation', async () => {
    findByID.mockResolvedValueOnce({ ...original, slides: [...original.slides].reverse() });
    expect((await revise()).status).toBe(409);
    expect(execute).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });

  it('saves the revised slide without replacing the stable ID or other slide', async () => {
    findByID.mockResolvedValueOnce(original);
    update.mockImplementationOnce(async ({ data }) => data);
    expect((await revise()).status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        data: { slides: [{ ...original.slides[0], title: 'Revised' }, original.slides[1]] },
      }),
    );
  });
});
