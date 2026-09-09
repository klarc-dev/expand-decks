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
      pdf: true,
      web: true,
      images: [{ key: 'cover-image', pageIndex: 0 }],
    });
  });

  it('selects one-page outputs without template-id branching', () => {
    expect(documentExportPlan(VISUAL_PUBLICATION_DOCUMENT_TEMPLATE)).toEqual({
      pdf: false,
      web: false,
      images: [{ key: 'page-image', pageIndex: 0 }],
    });
    expect(documentExportPlan(SALES_SHEET_DOCUMENT_TEMPLATE)).toEqual({
      pdf: true,
      web: false,
      images: [],
    });
  });
});
