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
  });
});
