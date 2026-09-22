import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  __registerNativePreviewForTests,
  __resetNativePreviewStoreForTests,
  __setNativePreviewNowForTests,
  nativePreviewUrl,
  serveNativePreview,
} from '../nativePreview';

describe('native preview serving', () => {
  const roots: string[] = [];

  afterEach(() => {
    __resetNativePreviewStoreForTests();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('requires the authenticated owner and serves the built index', async () => {
    const root = join(process.cwd(), '.native-preview-test');
    roots.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'index.html'), '<h1>preview</h1>');
    __registerNativePreviewForTests('token', { userId: 'u1', root, expiresAt: Date.now() + 1000 });

    expect(
      (await serveNativePreview({ token: 'token', userId: 'u2', pathSegments: [] })).status,
    ).toBe(404);
    const response = await serveNativePreview({ token: 'token', userId: 'u1', pathSegments: [] });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('preview');
  });

  it('rejects traversal and removes expired workdirs', async () => {
    const root = join(process.cwd(), '.native-preview-test-expired');
    roots.push(root);
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'index.html'), 'expired');
    __registerNativePreviewForTests('expired', { userId: 'u1', root, expiresAt: 10 });
    __setNativePreviewNowForTests(() => 10);

    expect(
      (await serveNativePreview({ token: 'expired', userId: 'u1', pathSegments: [] })).status,
    ).toBe(404);
    expect(() => rmSync(root, { recursive: true, force: true })).not.toThrow();

    const safeRoot = join(process.cwd(), '.native-preview-test-safe');
    roots.push(safeRoot);
    mkdirSync(join(safeRoot, 'dist'), { recursive: true });
    writeFileSync(join(safeRoot, 'dist', 'index.html'), 'safe');
    __setNativePreviewNowForTests(() => Date.now());
    __registerNativePreviewForTests('safe', {
      userId: 'u1',
      root: safeRoot,
      expiresAt: Date.now() + 1000,
    });
    expect(
      (await serveNativePreview({ token: 'safe', userId: 'u1', pathSegments: ['..', 'secret'] }))
        .status,
    ).toBe(403);
  });

  it('targets index.html so relative Slidev assets resolve under the token', () => {
    // Next.js drops the trailing slash of `/<token>/`; `./assets/*` would then
    // resolve to `/api/slide-preview/assets/*` and the deck never mounts.
    expect(nativePreviewUrl('tok en', 1)).toBe('/api/slide-preview/tok%20en/index.html#/2');
  });
});
