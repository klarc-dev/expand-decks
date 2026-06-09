import { z } from 'zod';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  optionalAi,
  optionalRender,
  rawField,
  richTextRender,
  titleFieldSpec,
} from './dsl';

const eyebrow = optionalRender(z.string());
const title = z.string();
const surface = optionalRender(z.enum(['dark', 'light']));
// Table layout variant (U10): 'reference' is the default plain table; 'matrix'
// renders ok/warn/blocked status cells as pills via the StatusPill helper.
const TABLE_VARIANTS = ['reference', 'matrix'] as const;
const tableVariant = optionalRender(z.enum(TABLE_VARIANTS));

const cell = z.object({ value: richTextRender() });
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
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre du tableau'),
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
    rawField('tableVariant', tableVariant, optionalAi(z.enum(TABLE_VARIANTS)), {
      type: 'select',
      label: 'Type de tableau',
      description:
        'reference : tableau standard. matrix : cellules de statut (ok / attention / bloqué) rendues en pastilles.',
      options: TABLE_VARIANTS.map((v) => ({ label: v, value: v })),
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
                rawField('value', richTextRender(), optionalAi(z.string()), {
                  type: 'richText',
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
      'tableVariant: "reference" (standard) | "matrix" (cellules de statut). Pour une matrice, mets ✓/⚠/✗ ou "ok"/"warn"/"blocked" dans les cellules de statut.',
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
  tableVariant,
  columns,
  rows,
});

export type TableBlockData = InferRender<typeof tableRenderSchema>;
