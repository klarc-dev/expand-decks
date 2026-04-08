import type { Block } from 'payload';

import { isAdminField } from '../access/roles';

export const MarkdownBlock: Block = {
  slug: 'markdown',
  labels: { singular: 'Markdown (avanc\u00e9)', plural: 'Blocs Markdown' },
  fields: [
    {
      name: 'layout',
      type: 'text',
      label: 'Layout Slidev',
      access: { create: isAdminField, update: isAdminField },
      admin: { description: 'Nom du layout Slidev (ex. "center", "default", "two-cols")' },
    },
    {
      name: 'frontmatter',
      type: 'code',
      label: 'Frontmatter YAML',
      access: { create: isAdminField, update: isAdminField },
      admin: {
        language: 'yaml',
        description: 'M\u00e9tadonn\u00e9es YAML de la diapositive (hors layout)',
      },
    },
    {
      name: 'content',
      type: 'code',
      label: 'Contenu Markdown',
      access: { create: isAdminField, update: isAdminField },
      admin: {
        language: 'markdown',
        description: 'Contenu brut de la diapositive en syntaxe Slidev/Markdown',
      },
    },
  ],
};
