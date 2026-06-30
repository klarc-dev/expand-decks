import { describe, expect, it, vi } from 'vitest';

import { CTX } from '../../lib/context';
import { BUILD_SLIDES_TASK } from '../../jobs/buildSlides';
import { afterPresentationChange, buildInputsChanged } from '../afterPresentationChange';

const base = {
  slides: [{ blockType: 'cover', title: 'A' }],
  organisation: 1,
  footer: { enabled: true, left: '{org.name}', center: '', right: '{page} / {total}' },
  title: 'Deck',
  language: 'fr',
};

describe('afterPresentationChange', () => {
  it('queues a build on every update save, even when the presentation is not published', async () => {
    const update = vi.fn().mockResolvedValue({});
    const queue = vi.fn().mockResolvedValue({});
    const doc = { id: 'presentation-1', status: 'draft', ...base };

    const result = await afterPresentationChange({
      doc,
      operation: 'update',
      req: { context: {}, payload: { update, jobs: { queue } } },
    } as never);

    expect(result).toBe(doc);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'presentations',
        id: 'presentation-1',
        context: { [CTX.skipBuildQueue]: true },
      }),
    );
    expect(update.mock.calls[0]?.[0].data.lastBuildToken).toEqual(expect.any(String));
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({
        task: BUILD_SLIDES_TASK,
        input: {
          presentationId: 'presentation-1',
          buildToken: update.mock.calls[0]?.[0].data.lastBuildToken,
        },
      }),
    );
  });

  it('does not queue when the internal skipBuildQueue flag is set', async () => {
    const update = vi.fn();
    const queue = vi.fn();
    const doc = { id: 'presentation-1', status: 'published', ...base };

    const result = await afterPresentationChange({
      doc,
      operation: 'update',
      req: { context: { [CTX.skipBuildQueue]: true }, payload: { update, jobs: { queue } } },
    } as never);

    expect(result).toBe(doc);
    expect(update).not.toHaveBeenCalled();
    expect(queue).not.toHaveBeenCalled();
  });
});

describe('buildInputsChanged — rebuild fingerprint', () => {
  it('is false when nothing build-affecting changed', () => {
    expect(buildInputsChanged({ ...base }, { ...base })).toBe(false);
  });

  it('ignores non-build fields (e.g. build artifacts / status)', () => {
    expect(
      buildInputsChanged(
        { ...base, lastBuildStatus: 'success', spaUrl: '/x' },
        { ...base, lastBuildStatus: 'idle', spaUrl: null },
      ),
    ).toBe(false);
  });

  it('detects slides changes', () => {
    expect(buildInputsChanged({ ...base, slides: [{ blockType: 'cta', title: 'Z' }] }, base)).toBe(
      true,
    );
  });

  it('detects organisation change (theme swap)', () => {
    expect(buildInputsChanged({ ...base, organisation: 2 }, base)).toBe(true);
  });

  it('treats a populated org relationship the same as its id', () => {
    expect(buildInputsChanged({ ...base, organisation: { id: 1, name: 'Klarc' } }, base)).toBe(
      false,
    );
  });

  it('detects footer, title and language changes', () => {
    expect(buildInputsChanged({ ...base, footer: { ...base.footer, left: '{title}' } }, base)).toBe(
      true,
    );
    expect(buildInputsChanged({ ...base, title: 'New' }, base)).toBe(true);
    expect(buildInputsChanged({ ...base, language: 'en' }, base)).toBe(true);
  });
});
