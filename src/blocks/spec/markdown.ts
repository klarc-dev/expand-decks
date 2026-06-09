import { z } from 'zod';

import { block, factoryField, type InferRender, optionalRender, rawField } from './dsl';

const layout = optionalRender(z.string());
const frontmatter = optionalRender(z.string());
const content = optionalRender(z.string());

export const markdownSpec = block({
  slug: 'markdown',
  blockType: 'markdown',
  aiDraftable: false,
  labels: { singular: 'Markdown (avancé)', plural: 'Blocs Markdown' },
  imageURL: '/block-previews/markdown.svg',
  fields: [
    rawField('layout', layout, false, {
      type: 'text',
      label: 'Layout Slidev',
      access: 'isAdminField',
      description: 'Nom du layout Slidev (ex. "center", "default", "two-cols")',
    }),
    rawField('frontmatter', frontmatter, false, {
      type: 'code',
      label: 'Frontmatter YAML',
      access: 'isAdminField',
      language: 'yaml',
      description: 'Métadonnées YAML de la diapositive (hors layout)',
    }),
    rawField('content', content, false, {
      type: 'code',
      label: 'Contenu Markdown',
      access: 'isAdminField',
      language: 'markdown',
      description: 'Contenu brut de la diapositive en syntaxe Slidev/Markdown',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
});

export const markdownRenderSchema = z.object({
  blockType: z.literal('markdown'),
  layout,
  frontmatter,
  content,
});

export type MarkdownBlockData = InferRender<typeof markdownRenderSchema>;
