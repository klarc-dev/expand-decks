import { z } from 'zod';

import {
  block,
  factoryField,
  type InferRender,
  limitedTextPayload,
  optionalLimitedRender,
  rawField,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const layout = optionalLimitedRender(SLIDE_LIMITS.markdown.layout);
const frontmatter = optionalLimitedRender(SLIDE_LIMITS.markdown.frontmatter);
const content = optionalLimitedRender(SLIDE_LIMITS.markdown.content);

export const markdownSpec = block({
  slug: 'markdown',
  blockType: 'markdown',
  aiDraftable: false,
  labels: { singular: 'Markdown (avancé)', plural: 'Blocs Markdown' },
  imageURL: '/block-previews/markdown.svg',
  fields: [
    rawField(
      'layout',
      layout,
      false,
      limitedTextPayload(SLIDE_LIMITS.markdown.layout, {
        type: 'text',
        label: 'Layout Slidev',
        access: 'isAdminField',
        description: 'Nom du layout Slidev (ex. "center", "default", "two-cols")',
      }),
    ),
    rawField(
      'frontmatter',
      frontmatter,
      false,
      limitedTextPayload(SLIDE_LIMITS.markdown.frontmatter, {
        type: 'code',
        label: 'Frontmatter YAML',
        access: 'isAdminField',
        language: 'yaml',
        description: 'Métadonnées YAML de la diapositive (hors layout)',
      }),
    ),
    rawField(
      'content',
      content,
      false,
      limitedTextPayload(SLIDE_LIMITS.markdown.content, {
        type: 'code',
        label: 'Contenu Markdown',
        access: 'isAdminField',
        language: 'markdown',
        description: 'Contenu brut de la diapositive en syntaxe Slidev/Markdown',
      }),
    ),
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
