import { describe, expect, it, vi } from 'vitest';

import { slideLayoutFingerprint } from '@/blocks/spec/slideContent';
import { executeSlideLayoutCommand, SlideLayoutCommandError } from '../slideLayoutChange';

const user = { id: 7, role: 'admin' };
const presentation = {
  id: 42,
  organisation: 1,
  documentTemplate: 'presentation',
  slides: [
    { id: 'cover-row', blockType: 'cover', title: 'Cover' },
    {
      id: 'slide-row',
      blockType: 'statement',
      title: 'Stable',
      body: {
        root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
      },
    },
    { id: 'cta-row', blockType: 'cta', title: 'Act' },
  ],
};

function payload(options?: { beforeLockedRead?: (state: typeof presentation) => void }) {
  const state = structuredClone(presentation);
  let reads = 0;
  return {
    state,
    db: {
      sessions: { 'tx-1': { db: { id: 'transaction-db' } } },
      beginTransaction: vi.fn(async () => 'tx-1'),
      commitTransaction: vi.fn(async () => undefined),
      rollbackTransaction: vi.fn(async () => undefined),
      execute: vi.fn(async () => undefined),
    },
    findByID: vi.fn(async () => {
      reads += 1;
      if (reads === 2) options?.beforeLockedRead?.(state);
      return structuredClone(state);
    }),
    update: vi.fn(async ({ data }: any) => {
      expect(Object.keys(data)).toEqual(['slides']);
      state.slides = structuredClone(data.slides);
      return structuredClone(state);
    }),
  };
}

describe('executeSlideLayoutCommand', () => {
  it('analyzes without persistence and returns a stale guard', async () => {
    const api = payload();
    const result = await executeSlideLayoutCommand({
      command: { action: 'analyze', deckId: 42, slideIndex: 1 },
      payload: api,
      user,
    });
    expect(result).toMatchObject({ slideId: 'slide-row', slideIndex: 1 });
    expect(result.fingerprint).toBe(slideLayoutFingerprint(presentation.slides[1]!));
    expect((result as any).compatibility).toHaveLength(12);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('returns deterministic recommendation and candidate preview contracts without persistence', async () => {
    const api = payload();
    const recommended = await executeSlideLayoutCommand({
      command: { action: 'recommend', deckId: 42, slideIndex: 1 },
      payload: api,
      user,
    });
    expect((recommended as any).recommendation).toMatchObject({ layout: 'statement' });
    const previewed = await executeSlideLayoutCommand({
      command: { action: 'preview', deckId: 42, slideIndex: 1, targetLayout: 'section' },
      payload: api,
      user,
    });
    expect(previewed).toMatchObject({
      targetLayout: 'section',
      candidate: { layout: 'section', candidate: { blockType: 'section', title: 'Stable' } },
    });
    expect(api.update).not.toHaveBeenCalled();
  });

  it('validates and persists one complete replacement with exactly one update', async () => {
    const api = payload();
    const result = await executeSlideLayoutCommand({
      command: {
        action: 'apply',
        deckId: 42,
        slideIndex: 1,
        targetLayout: 'section',
        expectedFingerprint: slideLayoutFingerprint(presentation.slides[1]!),
      },
      payload: api,
      user,
    });
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.db.execute).toHaveBeenCalledWith(
      expect.objectContaining({ db: api.db.sessions['tx-1'].db }),
    );
    expect(result).toMatchObject({ buildQueued: true, slideId: 'slide-row' });
    expect(result.slide).toMatchObject({ id: 'slide-row', blockType: 'section', title: 'Stable' });
    expect(api.state.slides.map((slide) => slide.id)).toEqual([
      'cover-row',
      'slide-row',
      'cta-row',
    ]);
  });

  it('rejects a stale apply before persistence', async () => {
    const api = payload();
    await expect(
      executeSlideLayoutCommand({
        command: {
          action: 'apply',
          deckId: 42,
          slideIndex: 1,
          targetLayout: 'section',
          expectedFingerprint: '0'.repeat(64),
        },
        payload: api,
        user,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'stale',
    } satisfies Partial<SlideLayoutCommandError>);
    expect(api.update).not.toHaveBeenCalled();
    expect(api.state).toEqual(presentation);
  });

  it('rejects a mutation that races between the initial read and locked persistence read', async () => {
    const api = payload({
      beforeLockedRead: (state) => {
        state.slides[1]!.title = 'Concurrent edit';
      },
    });
    await expect(
      executeSlideLayoutCommand({
        command: {
          action: 'apply',
          deckId: 42,
          slideIndex: 1,
          targetLayout: 'section',
          expectedFingerprint: slideLayoutFingerprint(presentation.slides[1]!),
        },
        payload: api,
        user,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'stale' });
    expect(api.update).not.toHaveBeenCalled();
    expect(api.db.rollbackTransaction).toHaveBeenCalledWith('tx-1');
    expect(api.state.slides[1]).toMatchObject({ title: 'Concurrent edit', blockType: 'statement' });
  });

  it('uses draft content only for the selected slide and rejects identity mismatch', async () => {
    const api = payload();
    const selected = presentation.slides[1]!;
    const result = await executeSlideLayoutCommand({
      command: {
        action: 'apply',
        deckId: 42,
        slideIndex: 1,
        targetLayout: 'section',
        expectedFingerprint: slideLayoutFingerprint(selected),
        draft: { slideId: 'slide-row', slide: { ...selected, title: 'Unsaved edit' } },
      },
      payload: api,
      user,
    });
    expect(result.slide).toMatchObject({ title: 'Unsaved edit', blockType: 'section' });
    expect(api.state.slides[0]).toEqual(presentation.slides[0]);
    expect(api.state.slides[2]).toEqual(presentation.slides[2]);

    const mismatched = payload();
    await expect(
      executeSlideLayoutCommand({
        command: {
          action: 'apply',
          deckId: 42,
          slideIndex: 1,
          targetLayout: 'section',
          expectedFingerprint: slideLayoutFingerprint(selected),
          draft: { slideId: 'other-row', slide: { ...selected, id: 'other-row' } },
        },
        payload: mismatched,
        user,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'identity_mismatch' });
    expect(mismatched.update).not.toHaveBeenCalled();
  });

  it('rejects stale and mismatched undo attempts without persistence', async () => {
    const api = payload();
    const changed = await executeSlideLayoutCommand({
      command: {
        action: 'apply',
        deckId: 42,
        slideIndex: 1,
        targetLayout: 'section',
        expectedFingerprint: slideLayoutFingerprint(presentation.slides[1]!),
      },
      payload: api,
      user,
    });
    api.update.mockClear();
    await expect(
      executeSlideLayoutCommand({
        command: {
          action: 'undo-layout',
          deckId: 42,
          slideIndex: 1,
          undoToken: changed.undoToken!,
          expectedFingerprint: '0'.repeat(64),
        },
        payload: api,
        user,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'stale' });
    await expect(
      executeSlideLayoutCommand({
        command: {
          action: 'undo-layout',
          deckId: 42,
          slideIndex: 1,
          undoToken: 'wrong-token',
          expectedFingerprint: changed.fingerprint,
        },
        payload: api,
        user,
      }),
    ).rejects.toMatchObject({ status: 422, code: 'invalid_layout_change' });
    expect(api.update).not.toHaveBeenCalled();
  });

  it('undoes only the matching current revision and persists once', async () => {
    const api = payload();
    const changed = await executeSlideLayoutCommand({
      command: {
        action: 'apply',
        deckId: 42,
        slideIndex: 1,
        targetLayout: 'section',
        expectedFingerprint: slideLayoutFingerprint(presentation.slides[1]!),
      },
      payload: api,
      user,
    });
    api.update.mockClear();
    const undone = await executeSlideLayoutCommand({
      command: {
        action: 'undo-layout',
        deckId: 42,
        slideIndex: 1,
        undoToken: changed.undoToken!,
        expectedFingerprint: changed.fingerprint,
      },
      payload: api,
      user,
    });
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(undone.slide).toMatchObject({
      id: 'slide-row',
      blockType: 'statement',
      title: 'Stable',
    });
  });
});
