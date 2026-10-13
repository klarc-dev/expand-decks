import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('runtime image', () => {
  it('ships the Slidev layout validator used by production builds', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');

    expect(dockerfile).toContain(
      'COPY slidev-workspace/package.json slidev-workspace/validate-layout.mjs ./slidev-workspace/',
    );
  });

  it('refuses to create PostgreSQL with missing or empty initialization configuration', () => {
    const compose = readFileSync('docker-compose.yaml', 'utf8');

    for (const key of ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']) {
      expect(compose).toContain(`${key}: \${${key}:?${key} must be set and non-empty}`);
    }
  });

  it('uses ultra as the Compose fallback for every agent job consumer', () => {
    const compose = readFileSync('docker-compose.yaml', 'utf8');
    const worker = compose.slice(compose.indexOf('  payload-worker-1: &payload-worker'));

    expect(compose).toContain(`OPENAI_MODEL: \${OPENAI_MODEL:-ultra}`);
    expect(worker).toContain(`OPENAI_MODEL: \${OPENAI_MODEL:-ultra}`);
  });

  it('gives every agent job consumer the same provider configuration', () => {
    const compose = readFileSync('docker-compose.yaml', 'utf8');
    const worker = compose.slice(compose.indexOf('  payload-worker-1: &payload-worker'));

    for (const key of ['CLIPROXYAPI_BASE_URL', 'CLIPROXYAPI_KEY', 'OPENAI_MODEL']) {
      expect(worker).toContain(`${key}:`);
    }
  });
});
