import { describe, expect, it } from 'vitest';

import { MAX_SELECTED_SOURCES } from '../../draftConfig';
import { normalizeSourceIds, resolveSourcePolicy, resolveSources } from '../resolve';
import { SourcePolicyError, TooManySourcesError, UnknownSourceError } from '../types';

const context = (docs: unknown[]) =>
  ({
    user: { id: 7, role: 'author' },
    payload: { find: async () => ({ docs }) },
  }) as never;

describe('normalizeSourceIds', () => {
  it('normalizes empty input and deduplicates in order', () => {
    expect(normalizeSourceIds(undefined)).toEqual([]);
    expect(normalizeSourceIds(['knowledge_1', 'knowledge_2', 'knowledge_1'])).toEqual([
      'knowledge_1',
      'knowledge_2',
    ]);
  });

  it('rejects malformed or excessive selections', () => {
    expect(() => normalizeSourceIds(['bad id with spaces'])).toThrow(UnknownSourceError);
    const tooMany = Array.from({ length: MAX_SELECTED_SOURCES + 1 }, (_, i) => `knowledge_${i}`);
    expect(() => normalizeSourceIds(tooMany)).toThrow(TooManySourcesError);
  });
});

describe('knowledge source resolution', () => {
  const sources = context([
    { id: 1, name: 'Contrats', readiness: 'ready' },
    { id: 2, name: 'Procédures', readiness: 'empty' },
  ]);

  it('resolves accessible knowledge ids to descriptors', async () => {
    await expect(resolveSources(['knowledge_1'], sources)).resolves.toEqual([
      expect.objectContaining({ id: 'knowledge_1', transport: 'knowledge', knowledgeBaseId: 1 }),
    ]);
  });

  it('treats inaccessible knowledge ids as unknown', async () => {
    await expect(resolveSources(['knowledge_99'], sources)).rejects.toMatchObject({
      unknownIds: ['knowledge_99'],
    });
  });

  it('requires exactly one source in exclusive mode', async () => {
    await expect(
      resolveSourcePolicy({ mode: 'exclusive', sourceIds: [] }, sources),
    ).rejects.toThrow(SourcePolicyError);
    await expect(
      resolveSourcePolicy(
        { mode: 'exclusive', sourceIds: ['knowledge_1', 'knowledge_2'] },
        sources,
      ),
    ).rejects.toThrow(SourcePolicyError);
  });

  it('preserves none and normalized multiple policies', async () => {
    await expect(resolveSourcePolicy({ mode: 'none', sourceIds: [] }, sources)).resolves.toEqual({
      policy: { mode: 'none', sourceIds: [] },
      sources: [],
    });
    const resolved = await resolveSourcePolicy(
      { mode: 'multiple', sourceIds: ['knowledge_2', 'knowledge_1', 'knowledge_2'] },
      sources,
    );
    expect(resolved.policy.sourceIds).toEqual(['knowledge_2', 'knowledge_1']);
  });
});
