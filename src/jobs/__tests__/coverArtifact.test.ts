import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { firstPngPath } from '../buildSlidesRunner';

describe('firstPngPath', () => {
  it('selects the first numbered Slidev PNG deterministically', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cover-artifact-test-'));
    try {
      writeFileSync(join(directory, 'slides-10.png'), '10');
      writeFileSync(join(directory, 'slides-1.png'), '1');
      writeFileSync(join(directory, 'notes.txt'), 'ignore');

      expect(firstPngPath(directory)).toBe(join(directory, 'slides-1.png'));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
