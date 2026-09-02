import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedString,
  limitedTextPayload,
  nonBlankLimitedString,
  optionalLimitedAi,
  optionalLimitedRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const source = limitedString(SLIDE_LIMITS.mermaid.source);
const caption = optionalLimitedRender(SLIDE_LIMITS.mermaid.caption);
const unfencedMermaid = nonBlankLimitedString(SLIDE_LIMITS.mermaid.source).refine(
  (value) => !value.includes('```'),
  'Le code Mermaid doit être fourni sans délimiteurs ```',
);

export const mermaidSpec = block({
  slug: 'mermaid',
  blockType: 'mermaid',
  aiDraftable: true,
  labels: { singular: 'Diagramme', plural: 'Diagrammes' },
  imageURL: '/block-previews/mermaid.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre du diagramme'),
    rawField(
      'source',
      unfencedMermaid,
      unfencedMermaid,
      limitedTextPayload(SLIDE_LIMITS.mermaid.source, {
        type: 'code',
        label: 'Source du diagramme',
        required: true,
        language: 'mermaid',
        description: 'Code Mermaid brut (flowchart, sequenceDiagram, etc.), sans la clôture ```',
      }),
    ),
    rawField(
      'caption',
      caption,
      optionalLimitedAi(SLIDE_LIMITS.mermaid.caption),
      limitedTextPayload(SLIDE_LIMITS.mermaid.caption, {
        type: 'text',
        label: 'Légende',
        description: 'Courte légende sous le diagramme (optionnelle)',
      }),
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 11,
    heading: 'mermaid',
    summary:
      'Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)',
    lines: [
      'eyebrow, title (obligatoire), caption',
      'source: code Mermaid brut UNIQUEMENT (ex. "flowchart TD\\n  A[X] --> B[Y]"), sans les délimiteurs ```',
    ],
  },
});

export const mermaidRenderSchema = z.object({
  blockType: z.literal('mermaid'),
  eyebrow,
  title,
  source,
  caption,
});

export type MermaidBlockData = InferRender<typeof mermaidRenderSchema>;
