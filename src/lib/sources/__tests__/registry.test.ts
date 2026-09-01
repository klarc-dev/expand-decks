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
  it('returns an empty registry when no env config is present', () => {
    delete process.env[SOURCE_REGISTRY_ENV];
    expect(listSourceDescriptors()).toEqual([]);
    expect(listSourceOptions()).toEqual([]);
  });

  it('projects only client-safe id and label fields', () => {
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

    expect(listSourceOptions()).toEqual([
      { id: 'fiscal-kb', label: 'Fiscal KB' },
      { id: 'web-docs', label: 'Web Docs' },
    ]);
    expect(JSON.stringify(listSourceOptions())).not.toContain('secret');
    expect(JSON.stringify(listSourceOptions())).not.toContain('command');
    expect(listSourceDescriptors()[0]).toMatchObject({ timeoutMs: 30_000 });
  });

  it('throws for malformed json and invalid descriptors', () => {
    process.env[SOURCE_REGISTRY_ENV] = '{nope';
    __resetSourceRegistryForTests();
    expect(() => listSourceDescriptors()).toThrow(SourceConfigError);

    setRegistry([
      { id: 'bad', label: '', allowedTools: ['search'], transport: 'http', url: 'not-a-url' },
    ]);
    expect(() => listSourceDescriptors()).toThrow(SourceConfigError);
  });

  it('throws for duplicate source ids', () => {
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

    expect(() => listSourceDescriptors()).toThrow(/duplicate source id/);
  });
});
