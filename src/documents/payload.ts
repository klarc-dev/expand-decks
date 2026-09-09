import type { Block, SelectField } from 'payload';

import { emitPayloadBlock } from '../blocks/spec/emit/emitPayloadBlock';
import { DOCUMENT_TEMPLATES, resolveDocumentTemplate, specsForDocumentTemplate } from './templates';

export function payloadBlocksForTemplate(templateValue: unknown): Block[] {
  const template = resolveDocumentTemplate(templateValue);
  return specsForDocumentTemplate(template).map(emitPayloadBlock) as Block[];
}

export const documentTemplateField: SelectField = {
  name: 'documentTemplate',
  type: 'select',
  defaultValue: 'presentation',
  label: 'Template de document',
  options: DOCUMENT_TEMPLATES.map((template) => ({
    label: template.label,
    value: template.id,
  })),
  validate: (value) => {
    try {
      resolveDocumentTemplate(value);
      return true;
    } catch (error) {
      return error instanceof Error ? error.message : 'Template de document invalide.';
    }
  },
  admin: {
    description: 'Format fixe qui définit le canvas, les layouts et les sorties.',
  },
};
