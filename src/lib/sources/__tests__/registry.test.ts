import { afterEach, describe, expect, it } from 'vitest';

import {
  __resetSourceRegistryForTests,
  listSourceDescriptors,
  listSourceOptions,
  SOURCE_REGISTRY_ENV,
} from '../registry';
import { SourceConfigError } from '../types';

const previous = process.env[SOURCE_REGISTRY_ENV];

afterEach(() => {
  if (previous === undefined) delete process.env[SOURCE_REGISTRY_ENV];
  else process.env[SOURCE_REGISTRY_ENV] = previous;
  __resetSourceRegistryForTests();
});

function setRegistry(value: unknown) {
  process.env[SOURCE_REGISTRY_ENV] = JSON.stringify(value);
  __resetSourceRegistryForTests();
}

describe('source registry', () => {
  it('returns an empty registry when no env config is present', async () => {
    delete process.env[SOURCE_REGISTRY_ENV];
    await expect(listSourceDescriptors()).resolves.toEqual([]);
    await expect(listSourceOptions()).resolves.toEqual([]);
  });

  it('projects only client-safe id and label fields', async () => {
    setRegistry([
      {
        id: 'fiscal-kb',
        label: 'Fiscal KB',
        allowedTools: ['search'],
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'secret' },
      },
      {
        id: 'web-docs',
        label: 'Web Docs',
        allowedTools: ['search'],
        transport: 'http',
        url: 'https://example.com/mcp',
      },
    ]);

    await expect(listSourceOptions()).resolves.toEqual([
      { id: 'fiscal-kb', label: 'Fiscal KB' },
      { id: 'web-docs', label: 'Web Docs' },
    ]);
    expect(JSON.stringify(await listSourceOptions())).not.toContain('secret');
    expect(JSON.stringify(await listSourceOptions())).not.toContain('command');
    expect((await listSourceDescriptors())[0]).toMatchObject({ timeoutMs: 30_000 });
  });

  it('throws for malformed json and invalid descriptors', async () => {
    process.env[SOURCE_REGISTRY_ENV] = '{nope';
    __resetSourceRegistryForTests();
    await expect(listSourceDescriptors()).rejects.toThrow(SourceConfigError);

    setRegistry([
      { id: 'bad', label: '', allowedTools: ['search'], transport: 'http', url: 'not-a-url' },
    ]);
    await expect(listSourceDescriptors()).rejects.toThrow(SourceConfigError);
  });

  it('throws for duplicate source ids', async () => {
    setRegistry([
      {
        id: 'same',
        label: 'One',
        allowedTools: ['search'],
        transport: 'http',
        url: 'https://example.com/a',
      },
      {
        id: 'same',
        label: 'Two',
        allowedTools: ['search'],
        transport: 'http',
        url: 'https://example.com/b',
      },
    ]);

    await expect(listSourceDescriptors()).rejects.toThrow(/duplicate source id/);
  });
});
