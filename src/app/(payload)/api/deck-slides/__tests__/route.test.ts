import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const findByID = vi.fn();
const update = vi.fn();

vi.mock('@/lib/authenticateRequest', () => ({
  authenticateRequest: vi.fn(async () => ({
    payload: { findByID, update },
    user: { id: 7, role: 'author' },
  })),
}));

import { GET, POST } from '../route';

const request = (body: unknown) =>
  new Request('http://localhost/api/deck-slides', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];

const slide = (title: string, id?: string) => ({
  blockType: 'statement',
  title,
  ...(id ? { id } : {}),
});

describe('POST /api/deck-slides', () => {
  beforeEach(() => {
    auth.mockReset();
    findByID.mockReset();
    update.mockReset();
    findByID.mockResolvedValue({
      id: 42,
      createdBy: 7,
      slides: [slide('One', 'row-1'), slide('Two', 'row-2')],
    });
    update.mockImplementation(async ({ data }: { data: { slides: unknown[] } }) => ({
      id: 42,
      slides: data.slides,
    }));
  });

  it('reads all slides or one slide', async () => {
    const all = await GET(
      new Request('http://localhost/api/deck-slides?deckId=42') as Parameters<typeof GET>[0],
    );
    expect(await all.json()).toMatchObject({ slides: [{ title: 'One' }, { title: 'Two' }] });

    const one = await GET(
      new Request('http://localhost/api/deck-slides?deckId=42&slideIndex=1') as Parameters<
        typeof GET
      >[0],
    );
    expect(await one.json()).toMatchObject({ slideIndex: 1, slide: { title: 'Two' } });
  });

  it('creates a validated slide at the requested index', async () => {
    const response = await POST(
      request({ action: 'create', deckId: 42, index: 1, slide: slide('New') }),
    );
    expect(response.status).toBe(200);
    expect(
      update.mock.calls[0][0].data.slides.map((item: { title: string }) => item.title),
    ).toEqual(['One', 'New', 'Two']);
  });

  it('updates one slide while preserving its row id', async () => {
    const response = await POST(
      request({ action: 'update', deckId: 42, slideIndex: 0, slide: slide('Updated') }),
    );
    expect(response.status).toBe(200);
    expect(update.mock.calls[0][0].data.slides[0]).toMatchObject({ title: 'Updated', id: 'row-1' });
  });

  it('deletes and moves slides', async () => {
    await POST(request({ action: 'delete', deckId: 42, slideIndex: 0 }));
    expect(
      update.mock.calls[0][0].data.slides.map((item: { title: string }) => item.title),
    ).toEqual(['Two']);

    await POST(request({ action: 'move', deckId: 42, slideIndex: 0, toIndex: 1 }));
    expect(
      update.mock.calls[1][0].data.slides.map((item: { title: string }) => item.title),
    ).toEqual(['Two', 'One']);
  });

  it('rejects malformed slides at the SSOT schema boundary', async () => {
    const response = await POST(
      request({ action: 'create', deckId: 42, slide: { blockType: 'statement' } }),
    );
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
