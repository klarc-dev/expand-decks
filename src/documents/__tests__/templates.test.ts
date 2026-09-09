import { describe, expect, it } from 'vitest';

import { ALL_SPECS } from '../../blocks/spec';
import {
  applyDocumentCanvasToHeadmatter,
  assertDocumentPages,
  DOCUMENT_TEMPLATES,
  documentTemplateSchemas,
  LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE,
  PRESENTATION_DOCUMENT_TEMPLATE,
  resolveDocumentTemplate,
  SALES_SHEET_DOCUMENT_TEMPLATE,
  type DocumentTemplateDefinition,
  VISUAL_PUBLICATION_DOCUMENT_TEMPLATE,
} from '../templates';

const minimalCover = { blockType: 'cover', title: 'Cover' };

describe('document template registry', () => {
  it('defines presentation behavior from one canonical contract', () => {
    expect(DOCUMENT_TEMPLATES).toHaveLength(4);
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

  it('defines the LinkedIn carousel as a portrait, image-per-page document', () => {
    expect(LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE).toMatchObject({
      id: 'linkedin-carousel',
      canvas: { width: 1080, height: 1350, aspectRatio: '4/5', orientation: 'portrait' },
      pageCount: { min: 2, max: 20 },
      chrome: { footer: false, logo: false, pageNumbers: false },
      artifacts: [
        expect.objectContaining({
          key: 'page-image',
          kind: 'image',
          location: 'file',
          repeat: 'per-page',
        }),
      ],
      primaryArtifact: 'page-image',
      agent: { pageCount: { min: 2, max: 20 } },
    });
    expect(LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE.allowedLayouts).toEqual([
      'cover',
      'statement',
      'twoCols',
      'cardGrid',
      'stats',
      'quotes',
      'timeline',
      'cta',
    ]);
  });

  it('rejects carousel page-count and layout violations before rendering', () => {
    expect(() => assertDocumentPages(LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE, [minimalCover])).toThrow(
      'entre 2 et 20 pages',
    );
    expect(() =>
      assertDocumentPages(LINKEDIN_CAROUSEL_DOCUMENT_TEMPLATE, [
        minimalCover,
        { blockType: 'table', title: 'Too dense' },
      ]),
    ).toThrow('page 2');
  });

  it('declares both one-page document templates without new layouts', () => {
    expect(VISUAL_PUBLICATION_DOCUMENT_TEMPLATE).toMatchObject({
      id: 'visual-publication',
      canvas: { width: 1080, height: 1080, aspectRatio: '1/1', orientation: 'square' },
      pageCount: { min: 1, max: 1 },
      chrome: { footer: false, logo: true, pageNumbers: false },
      artifacts: [expect.objectContaining({ key: 'page-image', kind: 'image', pageIndex: 0 })],
      primaryArtifact: 'page-image',
      agent: { pageCount: { min: 1, max: 1 } },
    });
    expect(SALES_SHEET_DOCUMENT_TEMPLATE).toMatchObject({
      id: 'sales-sheet',
      canvas: {
        width: 794,
        height: 1123,
        aspectRatio: '794/1123',
        orientation: 'portrait',
      },
      pageCount: { min: 1, max: 1 },
      chrome: { footer: true, logo: true, pageNumbers: false },
      artifacts: [expect.objectContaining({ key: 'pdf', kind: 'pdf' })],
      primaryArtifact: 'pdf',
      agent: { pageCount: { min: 1, max: 1 } },
    });

    const registeredLayouts = new Set(ALL_SPECS.map((spec) => spec.blockType));
    for (const template of [VISUAL_PUBLICATION_DOCUMENT_TEMPLATE, SALES_SHEET_DOCUMENT_TEMPLATE]) {
      expect(template.allowedLayouts.every((layout) => registeredLayouts.has(layout))).toBe(true);
    }
  });

  it('enforces exactly one allowed page for one-page templates across render and AI schemas', () => {
    const valid = { blockType: 'statement', title: 'One page' };

    for (const template of [VISUAL_PUBLICATION_DOCUMENT_TEMPLATE, SALES_SHEET_DOCUMENT_TEMPLATE]) {
      expect(documentTemplateSchemas(template).renderPages.safeParse([valid]).success).toBe(true);
      expect(documentTemplateSchemas(template).renderPages.safeParse([]).success).toBe(false);
      expect(documentTemplateSchemas(template).renderPages.safeParse([valid, valid]).success).toBe(
        false,
      );
      expect(documentTemplateSchemas(template).aiPages.safeParse([valid, valid]).success).toBe(
        false,
      );
    }
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
