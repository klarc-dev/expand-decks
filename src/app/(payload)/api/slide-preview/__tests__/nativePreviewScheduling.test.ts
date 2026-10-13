import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Replace the Slidev subprocess with a controllable fake so the test exercises
// the real serialisation, superseding and abort propagation of nativePreview.
const builds: Array<{ cwd: string; resolve: () => void; signal?: AbortSignal }> = [];
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execFile: (
      _file: string,
      _args: string[],
      options: { cwd: string; signal?: AbortSignal },
      callback: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const finish = () => {
        mkdirSync(join(options.cwd, 'dist'), { recursive: true });
        writeFileSync(join(options.cwd, 'dist', 'index.html'), '<html></html>');
        callback(null, '', '');
      };
      options.signal?.addEventListener('abort', () =>
        callback(Object.assign(new Error('aborted'), { name: 'AbortError' }), '', ''),
      );
      builds.push({ cwd: options.cwd, resolve: finish, signal: options.signal });
      return {} as ReturnType<typeof actual.execFile>;
    },
  };
});

import { resolveDocumentTemplate } from '@/documents/templates';
import {
  __resetNativePreviewStoreForTests,
  createNativePreview,
  PreviewSupersededError,
} from '../nativePreview';

const template = resolveDocumentTemplate('presentation');
const presentation = { id: 7, title: 'Deck', language: 'fr', slides: [] };
const request = (title: string, signal?: AbortSignal) =>
  createNativePreview({
    userId: 'u1',
    presentation,
    block: { blockType: 'statement', title },
    slideIndex: 0,
    organisation: null,
    template,
    signal,
  });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('native preview build scheduling', () => {
  afterEach(() => {
    __resetNativePreviewStoreForTests();
    builds.splice(0);
  });

  it('builds only the latest revision when an author keeps typing', async () => {
    const first = request('A');
    const firstOutcome = expect(first).rejects.toBeInstanceOf(PreviewSupersededError);
    await tick();
    expect(builds).toHaveLength(1);
    const second = request('AB');
    const secondOutcome = expect(second).rejects.toBeInstanceOf(PreviewSupersededError);
    const third = request('ABC');
    await tick();

    // The running build for "A" is cancelled; "AB" is dropped before it starts.
    expect(builds[0]!.signal?.aborted).toBe(true);
    await firstOutcome;
    await secondOutcome;
    await tick();
    expect(builds).toHaveLength(2);
    builds[1]!.resolve();
    await expect(third).resolves.toMatchObject({ token: expect.any(String) });
  });

  it('keeps builds of different authors or decks independent', async () => {
    const mine = request('mine');
    const other = createNativePreview({
      userId: 'u2',
      presentation,
      block: { blockType: 'statement', title: 'theirs' },
      slideIndex: 0,
      organisation: null,
      template,
    });
    await tick();
    builds[0]!.resolve();
    await mine;
    await tick();
    expect(builds[1]!.signal?.aborted).toBe(false);
    builds[1]!.resolve();
    await expect(other).resolves.toMatchObject({ token: expect.any(String) });
  });

  it('cancels the build when the client aborts the request', async () => {
    const controller = new AbortController();
    const pending = request('abandoned', controller.signal);
    const outcome = expect(pending).rejects.toBeInstanceOf(PreviewSupersededError);
    await tick();
    controller.abort();
    await outcome;
    expect(builds[0]!.signal?.aborted).toBe(true);
  });

  it('reuses a live workdir for identical content without rebuilding', async () => {
    const first = request('same');
    await tick();
    builds[0]!.resolve();
    const a = await first;
    const b = await request('same');
    expect(builds).toHaveLength(1);
    expect(a.token).not.toBe(b.token);
  });
});
