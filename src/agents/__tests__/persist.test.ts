import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/richTextWrite', () => ({
  convertSlidesMarkdownToLexical: vi.fn(async (slides) => slides),
}));

import { persistSlides } from '../tools/persist';

describe('persistSlides', () => {
  const update = vi.fn();
  const findByID = vi.fn();
  const payload = { update, findByID } as never;

  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    findByID.mockReset().mockResolvedValue({ draftRunId: 'active-run' });
  });

  it('replaces the stored deck with revised slides instead of appending', async () => {
    const revised = [{ blockType: 'statement', title: 'Revised' }] as never;

    await persistSlides({
      payload,
      presentationId: 1,
      slides: revised,
      mode: 'revise',
      existing: [{ blockType: 'cover', title: 'Old' }] as never,
    });

    expect(update.mock.calls[0]![0].data.slides).toEqual(revised);
    expect(update.mock.calls[0]![0]).not.toHaveProperty('context');
  });

  it('refuses to overwrite slides when a newer run took ownership before persistence', async () => {
    findByID.mockResolvedValue({ draftRunId: 'newer-run' });

    await expect(
      persistSlides({
        payload,
        presentationId: 1,
        mode: 'replace',
        expectedDraftRunId: 'older-run',
        slides: [{ blockType: 'statement', title: 'Stale result' }] as never,
      }),
    ).rejects.toThrow('superseded before slide persistence');
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to overwrite slides when ownership changes during slide preparation', async () => {
    findByID
      .mockResolvedValueOnce({ draftRunId: 'active-run' })
      .mockResolvedValueOnce({ draftRunId: 'newer-run' });

    await expect(
      persistSlides({
        payload,
        presentationId: 1,
        mode: 'replace',
        expectedDraftRunId: 'active-run',
        slides: [{ blockType: 'statement', title: 'Stale result' }] as never,
      }),
    ).rejects.toThrow('superseded during slide preparation');
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects malformed slides before conversion or persistence', async () => {
    await expect(
      persistSlides({
        payload,
        presentationId: 1,
        mode: 'replace',
        slides: [{ blockType: 'statement', title: '**Invalid title**' }] as never,
      }),
    ).rejects.toThrow('texte brut');
    expect(update).not.toHaveBeenCalled();
  });
});
