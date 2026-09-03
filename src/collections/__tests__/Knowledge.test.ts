import { describe, expect, it, vi } from 'vitest';

import { KnowledgeBases } from '../KnowledgeBases';
import {
  KnowledgeDocuments,
  canAccessKnowledgeDocuments,
  enforceKnowledgeMimeType,
  isAcceptedKnowledgeMimeType,
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
    expect(hook({ req: { user: { id: 42 } }, operation: 'update' })).toBeUndefined();
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

    it('scopes an author to documents in bases they can read', async () => {
      const find = vi.fn().mockResolvedValue({ docs: [{ id: 3 }, { id: 9 }] });
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
