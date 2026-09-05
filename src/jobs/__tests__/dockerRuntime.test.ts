import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('runtime image', () => {
  it('ships the Slidev layout validator used by production builds', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');

    expect(dockerfile).toContain(
      'COPY slidev-workspace/package.json slidev-workspace/validate-layout.mjs ./slidev-workspace/',
    );
  });
});
