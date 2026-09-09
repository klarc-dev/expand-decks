import { describe, expect, it } from 'vitest';

import { Presentations } from '../Presentations';

const beforeValidate = Presentations.hooks?.beforeValidate?.[0];

describe('Presentations document template contract', () => {
  it('stamps legacy records with the presentation template without changing slides', async () => {
    const slides = [{ blockType: 'cover', title: 'Existing cover' }];
    const data = { slides };

    const result = await beforeValidate?.({ data } as never);

    expect(result).toMatchObject({ documentTemplate: 'presentation' });
    expect((result as typeof data).slides).toBe(slides);
  });

  it('rejects unknown templates at the write boundary', () => {
    expect(() =>
      beforeValidate?.({
        data: { documentTemplate: 'unknown', slides: [] },
      } as never),
    ).toThrow('Template de document inconnu');
  });

  it('preserves the resolved template during partial metadata updates', async () => {
    const data = { lastBuildStatus: 'building' };

    const result = await beforeValidate?.({
      data,
      originalDoc: { documentTemplate: 'presentation' },
    } as never);

    expect(result).toMatchObject({
      documentTemplate: 'presentation',
      lastBuildStatus: 'building',
    });
  });

  it('validates existing pages when a partial update explicitly selects a template', () => {
    expect(() =>
      beforeValidate?.({
        data: { documentTemplate: 'presentation' },
        originalDoc: { slides: [{ blockType: 'unknown', title: 'Invalid' }] },
      } as never),
    ).toThrow('page 1');
  });

  it('allows an empty pre-generation draft, then validates pages once authored', async () => {
    expect(
      await beforeValidate?.({
        data: { documentTemplate: 'visual-publication', slides: [] },
      } as never),
    ).toMatchObject({ documentTemplate: 'visual-publication', slides: [] });
    expect(() =>
      beforeValidate?.({
        data: { documentTemplate: 'visual-publication', slides: 'invalid' },
      } as never),
    ).toThrow();

    expect(() =>
      beforeValidate?.({
        data: {
          documentTemplate: 'sales-sheet',
          slides: [
            { blockType: 'statement', title: 'First' },
            { blockType: 'statement', title: 'Second' },
          ],
        },
      } as never),
    ).toThrow('entre 1 et 1 pages');
    expect(() =>
      beforeValidate?.({
        data: {
          documentTemplate: 'visual-publication',
          slides: [{ blockType: 'table', title: 'Not visual' }],
        },
      } as never),
    ).toThrow('n’est pas autorisé');
  });

  it('rejects a standardized report with an invalid ordered structure', () => {
    expect(() =>
      beforeValidate?.({
        data: {
          documentTemplate: 'standard-report',
          slides: [
            { blockType: 'cover' },
            { blockType: 'agenda' },
            { blockType: 'statement' },
            { blockType: 'statement' },
            { blockType: 'table' },
            { blockType: 'cta' },
          ],
        },
      } as never),
    ).toThrow('layout « stats »');
  });

  it('keeps the existing presentation layout roster visible in the editor', () => {
    const visit = (fields: unknown[]): Record<string, unknown> | undefined => {
      for (const field of fields as Array<Record<string, unknown>>) {
        if (field.name === 'slides') return field;
        if (Array.isArray(field.fields)) {
          const found = visit(field.fields);
          if (found) return found;
        }
        if (Array.isArray(field.tabs)) {
          for (const tab of field.tabs as Array<Record<string, unknown>>) {
            if (!Array.isArray(tab.fields)) continue;
            const found = visit(tab.fields);
            if (found) return found;
          }
        }
      }
      return undefined;
    };

    const slidesField = visit(Presentations.fields as unknown[]);
    expect(slidesField).toBeDefined();
    expect((slidesField!.blocks as Array<{ slug: string }>).map((block) => block.slug)).toEqual([
      'cover',
      'section',
      'statement',
      'twoCols',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
      'table',
      'timeline',
      'mermaid',
      'agenda',
      'markdown',
    ]);

    const filterOptions = slidesField!.filterOptions as (args: {
      data?: Record<string, unknown>;
    }) => string[];
    expect(filterOptions({ data: { documentTemplate: 'visual-publication' } })).toEqual([
      'statement',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
    ]);
    expect(filterOptions({ data: { documentTemplate: 'sales-sheet' } })).toEqual([
      'statement',
      'twoCols',
      'cardGrid',
      'stats',
      'quotes',
      'cta',
      'table',
    ]);
    expect(filterOptions({ data: { documentTemplate: 'standard-report' } })).toEqual([
      'cover',
      'section',
      'statement',
      'twoCols',
      'stats',
      'cta',
      'table',
      'agenda',
    ]);
  });

  it('declares ordered generic build artifacts and keeps legacy fields hidden', () => {
    const visit = (fields: unknown[]): Array<Record<string, unknown>> => {
      const matches: Array<Record<string, unknown>> = [];
      for (const field of fields as Array<Record<string, unknown>>) {
        if (
          field.name === 'artifacts' ||
          ['spaUrl', 'pdfFile', 'coverImage'].includes(String(field.name))
        ) {
          matches.push(field);
        }
        if (Array.isArray(field.fields)) matches.push(...visit(field.fields));
        if (Array.isArray(field.tabs)) {
          for (const tab of field.tabs as Array<Record<string, unknown>>) {
            if (Array.isArray(tab.fields)) matches.push(...visit(tab.fields));
          }
        }
      }
      return matches;
    };

    const fields = visit(Presentations.fields as unknown[]);
    const artifacts = fields.find((field) => field.name === 'artifacts');
    expect(artifacts).toMatchObject({ type: 'array', admin: { readOnly: true } });
    expect((artifacts!.fields as Array<{ name?: string }>).map((field) => field.name)).toEqual([
      'key',
      'kind',
      'label',
      'actionLabel',
      'buildId',
      'file',
      'url',
      'pageIndex',
    ]);
    for (const name of ['spaUrl', 'pdfFile', 'coverImage']) {
      const field = fields.find((candidate) => candidate.name === name);
      expect(field).toMatchObject({
        admin: { readOnly: true, hidden: true },
      });
      expect((field!.access as { create: () => boolean }).create()).toBe(false);
      expect((field!.access as { update: () => boolean }).update()).toBe(false);
    }
  });

  it('resolves admin preview from the template primary artifact and rejects stale artifacts', () => {
    const preview = Presentations.admin?.preview as (data: Record<string, unknown>) => string;
    expect(
      preview({
        documentTemplate: 'presentation',
        lastBuildStatus: 'success',
        lastBuildToken: 'build-2',
        artifacts: [
          {
            key: 'web-presentation',
            kind: 'web',
            label: 'Web',
            actionLabel: 'Open',
            buildId: 'build-2',
            url: '/spa/current/index.html',
          },
        ],
      }),
    ).toBe('/spa/current/index.html');
    expect(() =>
      preview({
        documentTemplate: 'presentation',
        lastBuildStatus: 'success',
        lastBuildToken: 'build-2',
        artifacts: [
          {
            key: 'web-presentation',
            kind: 'web',
            label: 'Web',
            actionLabel: 'Open',
            buildId: 'build-1',
            url: '/spa/stale/index.html',
          },
        ],
      }),
    ).toThrow('artefact principal');
    expect(preview({ documentTemplate: 'presentation', lastBuildStatus: 'building' })).toBeNull();
  });
});
