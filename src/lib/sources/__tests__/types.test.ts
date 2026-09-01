import { describe, expect, it } from 'vitest';

import { SourceRegistrySchema } from '../types';

describe('source registry capability policy', () => {
  it('requires an explicit non-empty read-only tool allowlist', () => {
    const parsed = SourceRegistrySchema.safeParse([
      {
        id: 'knowledge',
        label: 'Knowledge',
        transport: 'http',
        url: 'https://example.test/mcp',
      },
    ]);

    expect(parsed.success).toBe(false);
  });

  it('accepts explicit failure mode, timeout and tool concurrency', () => {
    const parsed = SourceRegistrySchema.parse([
      {
        id: 'knowledge',
        label: 'Knowledge',
        transport: 'http',
        url: 'https://example.test/mcp',
        allowedTools: ['search', 'read_document'],
        failureMode: 'strict',
        timeoutMs: 12_000,
        toolCallConcurrency: 2,
      },
    ]);

    expect(parsed[0]).toMatchObject({
      allowedTools: ['search', 'read_document'],
      failureMode: 'strict',
      toolCallConcurrency: 2,
    });
  });
});
