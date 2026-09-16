import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd(), 'src');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(path) && !path.includes('__tests__') ? [path] : [];
  });
}

describe('slide-layout legacy bypass rescan', () => {
  it('keeps every active layout mutation caller behind the unified command boundary', () => {
    const bypasses = sourceFiles(ROOT)
      .filter((path) => path !== resolve(ROOT, 'blocks/spec/slideContent.ts'))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8');
        return /\b(?:applyLayoutProjection|undoLayoutProjection)\b/.test(source)
          ? [relative(process.cwd(), path)]
          : [];
      });

    expect(bypasses).toEqual(['src/lib/slideLayoutChange.ts']);
  });
});
