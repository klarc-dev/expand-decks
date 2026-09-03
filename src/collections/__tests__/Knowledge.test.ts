import { describe, expect, it, vi } from 'vitest';

import { KnowledgeBases } from '../KnowledgeBases';
import {
  KnowledgeDocuments,
  canAccessKnowledgeDocuments,
  enforceKnowledgeMimeType,
  isAcceptedKnowledgeMimeType,
  validateKnowledgeBaseRelationship,
  validateKnowledgeFileContent,
  titleFromFilename,
} from '../KnowledgeDocuments';

type NamedField = { name?: unknown; fields?: unknown };

function findNamedField(fields: readonly unknown[], name: string): Record<string, unknown> {
  for (const field of fields as NamedField[]) {
    if (field.name === name) return field as Record<string, unknown>;
    if (Array.isArray(field.fields)) {
      const nested = (field.fields as NamedField[]).find((child) => child.name === name);
      if (nested) return nested as Record<string, unknown>;
    }
  }
  throw new Error(`Field ${name} not found`);
}

describe('KnowledgeBases', () => {
  it('is registered under the centralized slug with French labels', () => {
    expect(KnowledgeBases.slug).toBe('knowledge-bases');
    expect(KnowledgeBases.labels).toEqual({
      singular: 'Base de connaissances',
      plural: 'Bases de connaissances',
    });
  });

  it('stamps the creator on create only', () => {
    const createdBy = findNamedField(KnowledgeBases.fields, 'createdBy');
    const hook = (createdBy.hooks as { beforeChange: ((args: unknown) => unknown)[] })
      .beforeChange[0];

    expect(hook({ req: { user: { id: 42 } }, operation: 'create' })).toBe(42);
    expect(hook({ req: { user: { id: 42 } }, operation: 'update', value: 17 })).toBe(17);
  });

  it('makes ownership and synthesis fields server-only', () => {
    for (const name of ['documentCount', 'chunkCount', 'lastIndexedAt']) {
      const field = findNamedField(KnowledgeBases.fields, name);
      const access = field.access as {
        create: (args: unknown) => boolean;
        update: (args: unknown) => boolean;
      };
      expect(access.update({ req: { context: {} } })).toBe(false);
      expect(access.update({ req: { context: { trustedKnowledgeLifecycle: true } } })).toBe(true);
    }
    const ownerAccess = findNamedField(KnowledgeBases.fields, 'createdBy').access as {
      create: (args: unknown) => boolean;
      update: (args: unknown) => boolean;
    };
    expect(ownerAccess.create({})).toBe(false);
    expect(ownerAccess.update({})).toBe(false);
  });

  it('exposes the ingestion summary as read-only fields', () => {
    for (const name of ['documentCount', 'chunkCount', 'lastIndexedAt']) {
      const field = findNamedField(KnowledgeBases.fields, name);
      expect((field.admin as { readOnly?: boolean }).readOnly).toBe(true);
    }
  });

  it('scopes non-admin reads to their own bases', () => {
    const read = KnowledgeBases.access?.read as (args: unknown) => unknown;
    expect(read({ req: { user: { id: 7, role: 'author' } } })).toEqual({
      createdBy: { equals: 7 },
    });
    expect(read({ req: { user: { id: 1, role: 'admin' } } })).toBe(true);
    expect(read({ req: { user: null } })).toBe(false);
  });
});

describe('KnowledgeDocuments', () => {
  it('uploads to a directory distinct from deck media', () => {
    const staticDir = (KnowledgeDocuments.upload as { staticDir: string }).staticDir;
    expect(staticDir.endsWith('/media/knowledge')).toBe(true);
  });

  it('accepts only PDF, DOCX, Markdown and plain text', () => {
    expect((KnowledgeDocuments.upload as { mimeTypes: string[] }).mimeTypes).toEqual([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ]);
    expect(isAcceptedKnowledgeMimeType('application/pdf')).toBe(true);
    expect(isAcceptedKnowledgeMimeType('text/plain; charset=utf-8')).toBe(true);
    expect(isAcceptedKnowledgeMimeType('image/png')).toBe(false);
    expect(isAcceptedKnowledgeMimeType(undefined)).toBe(false);
  });

  it('requires a knowledge base', () => {
    expect(findNamedField(KnowledgeDocuments.fields, 'knowledgeBase')).toMatchObject({
      type: 'relationship',
      relationTo: 'knowledge-bases',
      required: true,
    });
  });

  it('defaults the indexing status to pending and keeps it read-only', () => {
    const status = findNamedField(KnowledgeDocuments.fields, 'indexingStatus');
    expect(status.defaultValue).toBe('pending');
    expect((status.admin as { readOnly?: boolean }).readOnly).toBe(true);
    expect((status.options as { value: string }[]).map((option) => option.value)).toEqual([
      'pending',
      'indexing',
      'indexed',
      'failed',
    ]);
  });

  it('carries an error message, chunk count and source hash', () => {
    expect(findNamedField(KnowledgeDocuments.fields, 'errorMessage').type).toBe('textarea');
    expect(findNamedField(KnowledgeDocuments.fields, 'chunkCount').type).toBe('number');
    expect(findNamedField(KnowledgeDocuments.fields, 'sourceHash').type).toBe('text');
  });

  it('keeps lifecycle metadata writable only by trusted server context', () => {
    for (const name of ['indexingStatus', 'chunkCount', 'errorMessage', 'sourceHash']) {
      const access = findNamedField(KnowledgeDocuments.fields, name).access as {
        create: (args: unknown) => boolean;
        update: (args: unknown) => boolean;
      };
      expect(access.update({ req: { context: {} } })).toBe(false);
      expect(access.update({ req: { context: { trustedKnowledgeLifecycle: true } } })).toBe(true);
    }
  });

  describe('title prefill', () => {
    const hook = (
      findNamedField(KnowledgeDocuments.fields, 'title').hooks as {
        beforeValidate: ((args: unknown) => unknown)[];
      }
    ).beforeValidate[0];

    it('derives the title from the uploaded filename', () => {
      expect(titleFromFilename('Rapport annuel 2026.pdf')).toBe('Rapport annuel 2026');
      expect(titleFromFilename('notes')).toBe('notes');
      expect(titleFromFilename(undefined)).toBeUndefined();
      expect(hook({ value: undefined, data: { filename: 'Contrat cadre.docx' } })).toBe(
        'Contrat cadre',
      );
    });

    it('never overwrites a title the author has edited', () => {
      expect(hook({ value: 'Titre choisi', data: { filename: 'Contrat cadre.docx' } })).toBe(
        'Titre choisi',
      );
    });
  });

  describe('mime type enforcement', () => {
    it('normalizes markdown and text uploads misreported by the browser', () => {
      const data = { filename: 'notes.md', mimeType: 'application/octet-stream' };
      enforceKnowledgeMimeType({ data } as never);
      expect(data.mimeType).toBe('text/markdown');
    });

    it('rejects an unsupported format with a French message', () => {
      expect(() =>
        enforceKnowledgeMimeType({
          data: { filename: 'photo.png', mimeType: 'image/png' },
        } as never),
      ).toThrowError(/Formats acceptés/);
    });

    it('validates bytes instead of trusting the filename or MIME metadata', () => {
      expect(() =>
        validateKnowledgeFileContent('fake.pdf', 'application/pdf', Buffer.from('not a pdf')),
      ).toThrow(/PDF est invalide/);
      expect(() =>
        validateKnowledgeFileContent(
          'fake.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          Buffer.from('PK\u0003\u0004not ooxml'),
        ),
      ).toThrow(/DOCX est invalide/);
      expect(() =>
        validateKnowledgeFileContent('notes.txt', 'text/plain', Buffer.from([0x61, 0, 0x62])),
      ).toThrow(/données binaires/);
      expect(() =>
        validateKnowledgeFileContent('notes.md', 'text/markdown', Buffer.from('# valide', 'utf8')),
      ).not.toThrow();
    });

    it('leaves a file-less patch untouched', () => {
      const data = { title: 'Nouveau titre' };
      expect(enforceKnowledgeMimeType({ data } as never)).toBe(data);
    });
  });

  describe('access', () => {
    it('lets admins through without a lookup', async () => {
      const find = vi.fn();
      await expect(
        canAccessKnowledgeDocuments({
          req: { user: { id: 1, role: 'admin' }, payload: { find } },
        } as never),
      ).resolves.toBe(true);
      expect(find).not.toHaveBeenCalled();
    });

    it('denies anonymous access', async () => {
      await expect(
        canAccessKnowledgeDocuments({ req: { user: null, payload: {} } } as never),
      ).resolves.toBe(false);
    });

    it('rejects create or move into an inaccessible base', async () => {
      const findByID = vi.fn().mockRejectedValue(new Error('not found'));
      await expect(
        validateKnowledgeBaseRelationship({
          value: 99,
          req: { user: { id: 7 }, payload: { findByID } },
        } as never),
      ).rejects.toThrow(/inaccessible/);
      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ id: 99, overrideAccess: false, user: { id: 7 } }),
      );
    });

    it('paginates all readable bases with a stable sort', async () => {
      const find = vi
        .fn()
        .mockResolvedValueOnce({ docs: [{ id: 3 }], hasNextPage: true })
        .mockResolvedValueOnce({ docs: [{ id: 1003 }], hasNextPage: false });
      await expect(
        canAccessKnowledgeDocuments({
          req: { user: { id: 7, role: 'author' }, payload: { find } },
        } as never),
      ).resolves.toEqual({ knowledgeBase: { in: [3, 1003] } });
      expect(find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ page: 2, limit: 1000, sort: 'id' }),
      );
    });

    it('scopes an author to documents in bases they can read', async () => {
      const find = vi.fn().mockResolvedValue({ docs: [{ id: 3 }, { id: 9 }], hasNextPage: false });
      await expect(
        canAccessKnowledgeDocuments({
          req: { user: { id: 7, role: 'author' }, payload: { find } },
        } as never),
      ).resolves.toEqual({ knowledgeBase: { in: [3, 9] } });
      // Delegates to the KnowledgeBases read policy rather than re-deriving
      // ownership, so document scoping follows base scoping automatically.
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'knowledge-bases', overrideAccess: false }),
      );
    });
  });
});
