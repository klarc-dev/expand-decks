import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
  surfaceFieldSpec,
  titleFieldSpec,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const surface = optionalRender(z.enum(['dark', 'light']));
const source = z.string();
const caption = optionalRender(z.string());

export const mermaidSpec = block({
  slug: 'mermaid',
  blockType: 'mermaid',
  aiDraftable: true,
  labels: { singular: 'Diagramme', plural: 'Diagrammes' },
  imageURL: '/block-previews/mermaid.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre du diagramme'),
    surfaceFieldSpec(surface),
    rawField('source', source, z.string(), {
      type: 'code',
      label: 'Source du diagramme',
      required: true,
      language: 'mermaid',
      description: 'Code Mermaid brut (flowchart, sequenceDiagram, etc.), sans la clôture ```',
    }),
    rawField('caption', caption, optionalAi(z.string()), {
      type: 'text',
      label: 'Légende',
      description: 'Courte légende sous le diagramme (optionnelle)',
    }),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 11,
    heading: 'mermaid',
    summary: 'Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)',
    lines: [
      'eyebrow, title (obligatoire), surface ("light" | "dark"), caption',
      'source: code Mermaid brut UNIQUEMENT (ex. "flowchart TD\\n  A[X] --> B[Y]"), sans les délimiteurs ```',
    ],
  },
});

export const mermaidRenderSchema = z.object({
  blockType: z.literal('mermaid'),
  eyebrow,
  title,
  surface,
  source,
  caption,
});

export type MermaidBlockData = InferRender<typeof mermaidRenderSchema>;
