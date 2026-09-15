import type { DocumentTemplateId } from '@/documents/templates';

import { assessSlideLayoutCompatibility } from '@/blocks/spec/slideLayoutCompatibility';
import { resolveDocumentTemplate } from '@/documents/templates';

export function slideLayoutCompatibilityForTemplate(
  slide: Record<string, unknown>,
  templateValue: DocumentTemplateId | null | undefined,
) {
  const template = resolveDocumentTemplate(templateValue);
  return assessSlideLayoutCompatibility(slide, template.allowedLayouts);
}
