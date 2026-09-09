import { describe, expect, it } from 'vitest';

import { documentExportPlan } from '../exportPlan';
import {
  PRESENTATION_DOCUMENT_TEMPLATE,
  SALES_SHEET_DOCUMENT_TEMPLATE,
  VISUAL_PUBLICATION_DOCUMENT_TEMPLATE,
} from '../templates';

describe('document export plan', () => {
  it('preserves presentation outputs from their declarations', () => {
    expect(documentExportPlan(PRESENTATION_DOCUMENT_TEMPLATE)).toEqual({
      native: { pdf: true, web: true, coverImage: true, pageImages: false },
      pdf: [expect.objectContaining({ key: 'pdf', kind: 'pdf' })],
      web: [expect.objectContaining({ key: 'web-presentation', kind: 'web' })],
      images: [expect.objectContaining({ key: 'cover-image', kind: 'image', pageIndex: 0 })],
    });
  });

  it('keeps canonical native outputs while exposing only declared artifacts', () => {
    expect(documentExportPlan(VISUAL_PUBLICATION_DOCUMENT_TEMPLATE)).toMatchObject({
      native: { pdf: true, web: true, coverImage: true, pageImages: false },
      pdf: [],
      web: [],
      images: [{ key: 'page-image', kind: 'image', pageIndex: 0 }],
    });
    expect(documentExportPlan(SALES_SHEET_DOCUMENT_TEMPLATE)).toMatchObject({
      native: { pdf: true, web: true, coverImage: true, pageImages: false },
      pdf: [{ key: 'pdf', kind: 'pdf' }],
      web: [],
      images: [],
    });
  });
});
