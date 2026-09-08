import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('runtime image', () => {
  it('ships the Slidev layout validator used by production builds', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');

    expect(dockerfile).toContain(
      'COPY slidev-workspace/package.json slidev-workspace/validate-layout.mjs ./slidev-workspace/',
    );
  });

  it('gives every agent job consumer the same provider configuration', () => {
    const compose = readFileSync('docker-compose.yaml', 'utf8');
    const worker = compose.slice(compose.indexOf('  payload-worker-1: &payload-worker'));

    for (const key of [
      'CLIPROXYAPI_BASE_URL',
      'CLIPROXYAPI_KEY',
      'OPENAI_MODEL',
      'AGENT_SOURCE_REGISTRY_JSON',
    ]) {
      expect(worker).toContain(`${key}:`);
    }
  });
});
