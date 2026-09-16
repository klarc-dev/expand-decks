import { describe, expect, it } from 'vitest';

import { DOCUMENT_TEMPLATE_FIXTURES, documentTemplateFixture } from '../fixtures';
import { assertDocumentPages, DOCUMENT_TEMPLATES, documentTemplateSchemas } from '../templates';

describe('document template fixtures', () => {
  it('provides one valid reusable fixture for every registered template', () => {
    expect(DOCUMENT_TEMPLATE_FIXTURES.map((fixture) => fixture.id)).toEqual(
      DOCUMENT_TEMPLATES.map((template) => template.id),
    );

    for (const template of DOCUMENT_TEMPLATES) {
      const fixture = documentTemplateFixture(template.id);
      expect(() => assertDocumentPages(template, fixture.slides)).not.toThrow();
      expect(documentTemplateSchemas(template).renderPages.safeParse(fixture.slides).success).toBe(
        true,
      );
    }
  });

  it('keeps the sales-sheet CTA copy on fields the renderer consumes', () => {
    const [slide] = documentTemplateFixture('sales-sheet').slides;
    expect(slide).toMatchObject({
      blockType: 'cta',
      subtitle: expect.any(String),
      primaryAction: 'Planifier un échange',
    });
    expect(slide).not.toHaveProperty('body');
    expect(slide).not.toHaveProperty('primaryCtaLabel');
    expect(slide).not.toHaveProperty('secondaryCtaLabel');
  });

  it('fails closed for an unknown fixture id', () => {
    expect(() => documentTemplateFixture('unknown' as never)).toThrow(
      'Fixture de document inconnue',
    );
  });
});
