import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = mkdtempSync(join(tmpdir(), 'spa-files-test-'));
vi.mock('@/lib/paths', () => ({
  spaDir: (slug: string) => join(root, slug),
  INDEX_HTML: 'index.html',
}));

import { serveSpaFile } from '../spaFiles';

afterEach(() => {
  rmSync(join(root, 'deck'), { recursive: true, force: true });
});

describe('serveSpaFile', () => {
  it('anchors Slidev assets to the deck despite Next removing the trailing slash', async () => {
    mkdirSync(join(root, 'deck', 'assets'), { recursive: true });
    writeFileSync(
      join(root, 'deck', 'index.html'),
      '<!DOCTYPE html><html><head><script src="./assets/app.js"></script></head><body></body></html>',
    );
    writeFileSync(join(root, 'deck', 'assets', 'app.js'), 'window.ready = true');

    const index = await serveSpaFile('deck', []);
    expect(index.status).toBe(200);
    const html = await index.text();
    expect(html).toContain('<base href="/spa/deck/">');
    expect(new URL('./assets/app.js', 'https://example.com/spa/deck/').pathname).toBe(
      '/spa/deck/assets/app.js',
    );
    expect(index.headers.get('Cache-Control')).toBe('no-cache');

    const asset = await serveSpaFile('deck', ['assets', 'app.js']);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('Content-Type')).toContain('application/javascript');
    expect(await asset.text()).toBe('window.ready = true');
  });

  it('rejects invalid slugs and traversal before reading files', async () => {
    expect((await serveSpaFile('<script>', [])).status).toBe(404);
    expect((await serveSpaFile('deck', ['..', 'other'])).status).toBe(403);
  });
});
