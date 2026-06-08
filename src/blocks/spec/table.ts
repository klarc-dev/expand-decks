import { z } from 'zod';

import {
  block,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const surface = optionalRender(z.enum(['dark', 'light']));

const cell = z.object({ value: z.string() });
const column = z.object({ header: z.string() });
const row = z.object({ cells: z.array(cell) });

const columns = optionalRender(z.array(column));
const rows = optionalRender(z.array(row));

const aiCell = z.object({ value: z.string() });
const aiColumn = z.object({ header: z.string() });
const aiRow = z.object({ cells: z.array(aiCell) });

export const tableSpec = block({
  slug: 'table',
  blockType: 'table',
  aiDraftable: true,
  labels: { singular: 'Tableau', plural: 'Tableaux' },
  imageURL: '/block-previews/table.svg',
  fields: [
    factoryField('eyebrow', 'eyebrow', eyebrow, optionalAi(z.string())),
    factoryField('title', 'title', title, z.string(), {
      description: 'Titre du tableau',
    }),
    rawField('surface', surface, optionalAi(z.enum(['dark', 'light'])), {
      type: 'select',
      label: 'Surface',
      defaultValue: 'light',
      description: 'Apparence de fond de la diapositive',
      options: [
        { label: 'Clair', value: 'light' },
        { label: 'Sombre', value: 'dark' },
      ],
    }),
    rawField(
      'columns',
      z.array(z.unknown()),
      optionalAi(z.array(aiColumn).min(2).max(5)),
      {
        type: 'array',
        label: 'Colonnes',
        description: 'En-têtes de colonnes (2 à 5)',
        fields: [
          rawField('header', z.string(), optionalAi(z.string()), {
            type: 'text',
            label: 'En-tête',
            required: true,
            description: 'Libellé de la colonne',
          }),
        ],
      },
    ),
    rawField(
      'rows',
      z.array(z.unknown()),
      optionalAi(z.array(aiRow).min(1).max(8)),
      {
        type: 'array',
        label: 'Lignes',
        description: 'Lignes du tableau ; chaque cellule correspond à une colonne, dans l’ordre',
        fields: [
          rawField(
            'cells',
            z.array(z.unknown()),
            optionalAi(z.array(aiCell)),
            {
              type: 'array',
              label: 'Cellules',
              description: 'Une cellule par colonne, dans l’ordre des colonnes',
              fields: [
                rawField('value', z.string(), optionalAi(z.string()), {
                  type: 'textarea',
                  label: 'Contenu',
                  description: 'Texte de la cellule',
                }),
              ],
            },
          ),
        ],
      },
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 9,
    heading: 'table',
    summary: 'Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)',
    lines: [
      'eyebrow, title (obligatoire), surface ("light" | "dark")',
      'columns: [{header}] — 2 à 5 colonnes',
      'rows: [{cells: [{value}]}] — chaque ligne a une cellule par colonne, dans le même ordre',
    ],
  },
});

export const tableRenderSchema = z.object({
  blockType: z.literal('table'),
  eyebrow,
  title,
  surface,
  columns,
  rows,
});

export type TableBlockData = InferRender<typeof tableRenderSchema>;
