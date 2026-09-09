import { describe, expect, it } from 'vitest';

import { ALL_SPECS } from '../../blocks/spec';
import {
  applyDocumentCanvasToHeadmatter,
  assertDocumentPages,
  DOCUMENT_TEMPLATES,
  documentTemplateSchemas,
  PRESENTATION_DOCUMENT_TEMPLATE,
  resolveDocumentTemplate,
  type DocumentTemplateDefinition,
} from '../templates';

const minimalCover = { blockType: 'cover', title: 'Cover' };

describe('document template registry', () => {
  it('defines presentation behavior from one canonical contract', () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(1);
    expect(PRESENTATION_DOCUMENT_TEMPLATE).toMatchObject({
      id: 'presentation',
      label: 'Présentation 16:9',
      canvas: { width: 1280, height: 720, aspectRatio: '16/9', orientation: 'landscape' },
      pageCount: { min: 0, max: null },
      chrome: { footer: true, logo: true, pageNumbers: true },
      artifacts: [
        expect.objectContaining({ key: 'pdf', kind: 'pdf', location: 'file' }),
        expect.objectContaining({ key: 'web-presentation', kind: 'web', location: 'url' }),
        expect.objectContaining({ key: 'cover-image', kind: 'image', pageIndex: 0 }),
      ],
      primaryArtifact: 'web-presentation',
      agent: { pageCount: { min: 3, max: 40 } },
    });
    expect(PRESENTATION_DOCUMENT_TEMPLATE.allowedLayouts).toEqual(
      ALL_SPECS.map((spec) => spec.blockType),
    );
  });

  it('maps missing legacy values to presentation but rejects explicit unknown values', () => {
    expect(resolveDocumentTemplate(undefined).id).toBe('presentation');
    expect(resolveDocumentTemplate(null).id).toBe('presentation');
    expect(() => resolveDocumentTemplate('unknown')).toThrow('Template de document inconnu');
  });

  it('derives render, AI, and outline schemas from the allowed layouts', () => {
    const restricted = {
      ...PRESENTATION_DOCUMENT_TEMPLATE,
      allowedLayouts: ['cover', 'cta'],
    } satisfies DocumentTemplateDefinition;
    const schemas = documentTemplateSchemas(restricted);

    expect(schemas.renderPage.safeParse(minimalCover).success).toBe(true);
    expect(schemas.renderPage.safeParse({ blockType: 'statement', title: 'No' }).success).toBe(
      false,
    );
    expect(schemas.aiPage.safeParse({ blockType: 'cta', title: 'Act' }).success).toBe(true);
    expect(schemas.aiPage.safeParse({ blockType: 'statement', title: 'No' }).success).toBe(false);
    expect(
      schemas.outline.safeParse({
        slides: [
          { blockType: 'cover', title: 'Cover', intent: 'Open' },
          { blockType: 'cta', title: 'Act', intent: 'Close' },
          { blockType: 'cta', title: 'Next', intent: 'Close' },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects a layout disallowed by the resolved template with its page number', () => {
    const restricted = {
      ...PRESENTATION_DOCUMENT_TEMPLATE,
      allowedLayouts: ['cover'],
    } satisfies DocumentTemplateDefinition;

    expect(() =>
      assertDocumentPages(restricted, [minimalCover, { blockType: 'cta', title: 'No' }]),
    ).toThrow('page 2');
  });

  it('projects canvas geometry into Slidev headmatter', () => {
    expect(
      applyDocumentCanvasToHeadmatter(
        'aspectRatio: 4/3\ncanvasWidth: 800',
        PRESENTATION_DOCUMENT_TEMPLATE,
      ),
    ).toBe('aspectRatio: 16/9\ncanvasWidth: 1280');
    expect(applyDocumentCanvasToHeadmatter('theme: default', PRESENTATION_DOCUMENT_TEMPLATE)).toBe(
      'theme: default\naspectRatio: 16/9\ncanvasWidth: 1280',
    );
  });
});
