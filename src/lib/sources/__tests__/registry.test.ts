import { describe, expect, it, vi } from 'vitest';

import { listSourceDescriptors, listSourceOptions } from '../registry';

const context = (docs: unknown[]) =>
  ({
    user: { id: 7, role: 'author' },
    payload: { find: vi.fn().mockResolvedValue({ docs }) },
  }) as never;

describe('knowledge source registry', () => {
  it('returns no sources without an authenticated context', async () => {
    await expect(listSourceDescriptors()).resolves.toEqual([]);
    await expect(listSourceOptions()).resolves.toEqual([]);
  });

  it('projects accessible knowledge bases into descriptors and client-safe options', async () => {
    const requestContext = context([{ id: 42, name: 'Contrats', readiness: 'ready' }]);

    await expect(listSourceDescriptors(requestContext)).resolves.toEqual([
      expect.objectContaining({
        id: 'knowledge_42',
        label: 'Contrats',
        transport: 'knowledge',
        knowledgeBaseId: 42,
        indexName: 'knowledge_42',
        readiness: 'ready',
        allowedTools: ['search'],
      }),
    ]);
    await expect(listSourceOptions(requestContext)).resolves.toEqual([
      { id: 'knowledge_42', label: 'Contrats', kind: 'knowledge', readiness: 'ready' },
    ]);
  });

  it('defaults missing readiness to empty', async () => {
    await expect(listSourceOptions(context([{ id: '9', name: 'Procédures' }]))).resolves.toEqual([
      { id: 'knowledge_9', label: 'Procédures', kind: 'knowledge', readiness: 'empty' },
    ]);
  });
});
