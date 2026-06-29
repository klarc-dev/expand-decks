import { afterEach, describe, expect, it } from 'vitest';

import { __resetSourceRegistryForTests, SOURCE_REGISTRY_ENV } from '../registry';
import { normalizeSourceIds, resolveSources } from '../resolve';
import { MAX_SELECTED_SOURCES, TooManySourcesError, UnknownSourceError } from '../types';

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
  { id: 'fiscal-kb', label: 'Fiscal KB', transport: 'http', url: 'https://example.com/a' },
  { id: 'web-docs', label: 'Web Docs', transport: 'http', url: 'https://example.com/b' },
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

describe('resolveSources', () => {
  it('resolves known ids to descriptors', () => {
    setRegistry(twoSources);
    const resolved = resolveSources(['web-docs']);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.id).toBe('web-docs');
  });

  it('rejects unknown ids with UnknownSourceError listing the unknowns', () => {
    setRegistry(twoSources);
    try {
      resolveSources(['fiscal-kb', 'ghost']);
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownSourceError);
      expect((error as UnknownSourceError).unknownIds).toEqual(['ghost']);
    }
  });

  it('resolves to empty for empty selection', () => {
    setRegistry(twoSources);
    expect(resolveSources([])).toEqual([]);
  });
});
