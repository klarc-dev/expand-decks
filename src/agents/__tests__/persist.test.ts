import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/richTextWrite', () => ({
  convertSlidesMarkdownToLexical: vi.fn(async (slides) => slides),
}));

import { persistSlides } from '../tools/persist';

describe('persistSlides', () => {
  const update = vi.fn();
  const payload = { update } as never;

  beforeEach(() => update.mockReset().mockResolvedValue({}));

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
  });
});
