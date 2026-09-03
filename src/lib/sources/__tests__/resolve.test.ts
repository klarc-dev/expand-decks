import { afterEach, describe, expect, it } from 'vitest';

import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '../registry';
import { normalizeSourceIds, resolveSourcePolicy, resolveSources } from '../resolve';
import {
  MAX_SELECTED_SOURCES,
  SourcePolicyError,
  TooManySourcesError,
  UnknownSourceError,
} from '../types';

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

const twoSources = [
  {
    id: 'fiscal-kb',
    label: 'Fiscal KB',
    allowedTools: ['search'],
    transport: 'http',
    url: 'https://example.com/a',
  },
  {
    id: 'web-docs',
    label: 'Web Docs',
    allowedTools: ['search'],
    transport: 'http',
    url: 'https://example.com/b',
  },
];

describe('normalizeSourceIds', () => {
  it('returns an empty array for empty/undefined input', () => {
    expect(normalizeSourceIds(undefined)).toEqual([]);
    expect(normalizeSourceIds([])).toEqual([]);
  });

  it('deduplicates while preserving order', () => {
    expect(normalizeSourceIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('rejects malformed ids', () => {
    expect(() => normalizeSourceIds(['bad id with spaces'])).toThrow(UnknownSourceError);
  });

  it('rejects more ids than the cap', () => {
    const tooMany = Array.from({ length: MAX_SELECTED_SOURCES + 1 }, (_, i) => `s${i}`);
    expect(() => normalizeSourceIds(tooMany)).toThrow(TooManySourcesError);
  });
});

describe('resolveSourcePolicy', () => {
  it('normalizes and resolves an exclusive source', async () => {
    setRegistry(twoSources);
    await expect(
      resolveSourcePolicy({ mode: 'exclusive', sourceIds: [' web-docs '] }),
    ).resolves.toEqual({
      policy: { mode: 'exclusive', sourceIds: ['web-docs'] },
      sources: [expect.objectContaining({ id: 'web-docs' })],
    });
  });

  it('rejects empty and broadened exclusive selections', async () => {
    setRegistry(twoSources);
    await expect(resolveSourcePolicy({ mode: 'exclusive', sourceIds: [] })).rejects.toThrow(
      SourcePolicyError,
    );
    await expect(
      resolveSourcePolicy({ mode: 'exclusive', sourceIds: ['fiscal-kb', 'web-docs'] }),
    ).rejects.toThrow(SourcePolicyError);
  });

  it('preserves none and multiple behavior', async () => {
    setRegistry(twoSources);
    expect((await resolveSourcePolicy({ mode: 'none', sourceIds: [] })).sources).toEqual([]);
    expect(
      (
        await resolveSourcePolicy({
          mode: 'multiple',
          sourceIds: ['web-docs', 'fiscal-kb', 'web-docs'],
        })
      ).policy.sourceIds,
    ).toEqual(['web-docs', 'fiscal-kb']);
  });
});

describe('resolveSources', () => {
  it('resolves mixed MCP and accessible knowledge sources', async () => {
    setRegistry(twoSources);
    const context = {
      user: { id: 7, role: 'author' },
      payload: {
        find: async () => ({ docs: [{ id: 42, name: 'Contrats' }] }),
      },
    } as never;

    const resolved = await resolveSources(['web-docs', 'knowledge_42'], context);
    expect(resolved.map(({ id, transport }) => ({ id, transport }))).toEqual([
      { id: 'web-docs', transport: 'http' },
      { id: 'knowledge_42', transport: 'knowledge' },
    ]);
  });

  it('applies the global cap before resolving a mixed selection', async () => {
    const mixed = [
      'knowledge_1',
      ...Array.from({ length: MAX_SELECTED_SOURCES }, (_, i) => `s${i}`),
    ];
    await expect(resolveSources(mixed, {} as never)).rejects.toThrow(TooManySourcesError);
  });

  it('rejects two knowledge bases in exclusive mode', async () => {
    await expect(
      resolveSourcePolicy(
        { mode: 'exclusive', sourceIds: ['knowledge_1', 'knowledge_2'] },
        {} as never,
      ),
    ).rejects.toThrow(SourcePolicyError);
  });

  it('treats inaccessible knowledge ids as unknown', async () => {
    setRegistry([]);
    const context = {
      user: { id: 7, role: 'author' },
      payload: { find: async () => ({ docs: [] }) },
    } as never;
    await expect(resolveSources(['knowledge_99'], context)).rejects.toMatchObject({
      unknownIds: ['knowledge_99'],
    });
  });

  it('resolves known ids to descriptors', async () => {
    setRegistry(twoSources);
    const resolved = await resolveSources(['web-docs']);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.id).toBe('web-docs');
  });

  it('rejects unknown ids with UnknownSourceError listing the unknowns', async () => {
    setRegistry(twoSources);
    try {
      await resolveSources(['fiscal-kb', 'ghost']);
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownSourceError);
      expect((error as UnknownSourceError).unknownIds).toEqual(['ghost']);
    }
  });

  it('resolves to empty for empty selection', async () => {
    setRegistry(twoSources);
    await expect(resolveSources([])).resolves.toEqual([]);
  });
});
