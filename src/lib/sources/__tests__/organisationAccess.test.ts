import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeBases } from '../../../collections/KnowledgeBases';
import { KnowledgeDocuments } from '../../../collections/KnowledgeDocuments';
import { resolveSources } from '../resolve';
import { __resetSourceRegistryForTests, listSourceOptions, SOURCE_REGISTRY_ENV } from '../registry';
import type { SourceResolutionContext } from '../types';

const previous = process.env[SOURCE_REGISTRY_ENV];
afterEach(() => {
  if (previous === undefined) delete process.env[SOURCE_REGISTRY_ENV];
  else process.env[SOURCE_REGISTRY_ENV] = previous;
  __resetSourceRegistryForTests();
});

describe('organisation-scoped knowledge source discovery', () => {
  it('uses collection access for a colleague’s base and rejects a foreign base', async () => {
    process.env[SOURCE_REGISTRY_ENV] = '[]';
    __resetSourceRegistryForTests();
    const user = { id: 7, role: 'author', organisations: [11] };
    const find = vi.fn(async (args) => {
      expect(args.overrideAccess).toBe(false);
      expect(args.user).toBe(user);
      const config = args.collection === 'knowledge-bases' ? KnowledgeBases : KnowledgeDocuments;
      const scope = await config.access!.read!({ req: { user } } as never);
      const key =
        args.collection === 'knowledge-bases' ? 'organisation' : 'knowledgeBase.organisation';
      expect(scope).toEqual({ [key]: { in: [11] } });
      return {
        docs:
          args.collection === 'knowledge-bases'
            ? [{ id: 42, name: 'Shared team base', organisation: 11, createdBy: 8 }]
            : [{ id: 9, knowledgeBase: 42, indexingStatus: 'indexed' }],
      };
    });
    const context = { user, payload: { find } } as unknown as SourceResolutionContext;
    expect(await listSourceOptions(context)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'knowledge_42', label: 'Shared team base' }),
      ]),
    );
    expect(await resolveSources(['knowledge_42'], context)).toEqual([
      expect.objectContaining({ id: 'knowledge_42', knowledgeBaseId: 42 }),
    ]);
    await expect(resolveSources(['knowledge_99'], context)).rejects.toMatchObject({
      unknownIds: ['knowledge_99'],
    });
  });
});
