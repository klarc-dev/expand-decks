import { z } from 'zod';

import {
  findTableAlignmentIssue,
  tableAlignmentMessage,
  validateTableRows,
} from '../tableValidation';

import {
  block,
  eyebrowFieldSpec,
  factoryField,
  type InferRender,
  limitedArray,
  limitedArrayPayload,
  limitedRichTextRender,
  limitedString,
  limitedTextPayload,
  optionalAi,
  optionalLimitedAi,
  optionalLimitedRender,
  optionalRender,
  rawField,
  titleFieldSpec,
} from './dsl';
import { SLIDE_LIMITS } from './limits';

const eyebrow = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow);
const title = limitedString(SLIDE_LIMITS.common.title);
const TABLE_VARIANTS = ['reference', 'matrix'] as const;
const tableVariant = optionalRender(z.enum(TABLE_VARIANTS));

const cell = z.object({ value: limitedRichTextRender(SLIDE_LIMITS.table.cell) });
const column = z.object({ header: limitedString(SLIDE_LIMITS.table.header) });
const row = z.object({ cells: z.array(cell) });
const columns = optionalRender(limitedArray(column, SLIDE_LIMITS.table.columns));
const rows = optionalRender(limitedArray(row, SLIDE_LIMITS.table.rows));

const aiCell = z.object({ value: limitedString(SLIDE_LIMITS.table.cell) });
const aiColumn = z.object({ header: limitedString(SLIDE_LIMITS.table.header) });
const aiRow = z.object({ cells: z.array(aiCell) });
const aiColumns = optionalAi(limitedArray(aiColumn, SLIDE_LIMITS.table.columns));
const aiRows = optionalAi(limitedArray(aiRow, SLIDE_LIMITS.table.rows));

const refineTableAi = (schema: z.ZodObject) =>
  schema.superRefine((value, ctx) => {
    const issue = findTableAlignmentIssue(
      value.columns as unknown[] | undefined,
      value.rows as Array<{ cells?: unknown[] }> | undefined,
    );
    if (!issue) return;
    ctx.addIssue({
      code: 'custom',
      path: ['rows', issue.rowIndex, 'cells'],
      message: tableAlignmentMessage(issue),
    });
  });

const refineTableRender = (schema: z.ZodObject) =>
  schema.superRefine((value, ctx) => {
    const issue = findTableAlignmentIssue(
      value.columns as unknown[] | undefined,
      value.rows as Array<{ cells?: unknown[] }> | undefined,
    );
    if (!issue) return;
    ctx.addIssue({
      code: 'custom',
      path: ['rows', issue.rowIndex, 'cells'],
      message: tableAlignmentMessage(issue),
    });
  });

export const tableSpec = block({
  slug: 'table',
  blockType: 'table',
  aiDraftable: true,
  aiRefine: refineTableAi,
  renderRefine: refineTableRender,
  labels: { singular: 'Tableau', plural: 'Tableaux' },
  imageURL: '/block-previews/table.svg',
  fields: [
    eyebrowFieldSpec(eyebrow),
    titleFieldSpec(title, 'Titre du tableau'),
    rawField('tableVariant', tableVariant, optionalAi(z.enum(TABLE_VARIANTS)), {
      type: 'select',
      label: 'Type de tableau',
      description:
        'reference : tableau standard. matrix : cellules de statut (ok / attention / bloqué) rendues en pastilles.',
      options: TABLE_VARIANTS.map((value) => ({ label: value, value })),
    }),
    rawField(
      'columns',
      columns,
      aiColumns,
      limitedArrayPayload(SLIDE_LIMITS.table.columns, {
        type: 'array',
        label: 'Colonnes',
        defaultValue: [{ header: '' }, { header: '' }],
        labels: { singular: 'Colonne', plural: 'Colonnes' },
        description: 'En-têtes de colonnes',
        adminHidden: true,
        fields: [
          rawField(
            'header',
            limitedString(SLIDE_LIMITS.table.header),
            optionalLimitedAi(SLIDE_LIMITS.table.header),
            limitedTextPayload(SLIDE_LIMITS.table.header, {
              type: 'text',
              label: 'En-tête',
              required: true,
              description: 'Libellé de la colonne',
            }),
          ),
        ],
      }),
    ),
    rawField(
      'rows',
      rows,
      aiRows,
      limitedArrayPayload(SLIDE_LIMITS.table.rows, {
        type: 'array',
        label: 'Lignes',
        defaultValue: [{ cells: [{ value: null }, { value: null }] }],
        labels: { singular: 'Ligne', plural: 'Lignes' },
        description: 'Lignes du tableau ; chaque cellule correspond à une colonne, dans l’ordre',
        adminFieldComponent: '/components/TableEditor#default',
        validate: validateTableRows,
        fields: [
          rawField('cells', z.array(cell), optionalAi(z.array(aiCell)), {
            type: 'array',
            label: 'Cellules',
            labels: { singular: 'Cellule', plural: 'Cellules' },
            description: 'Une cellule par colonne, dans l’ordre des colonnes',
            fields: [
              rawField(
                'value',
                limitedRichTextRender(SLIDE_LIMITS.table.cell),
                optionalLimitedAi(SLIDE_LIMITS.table.cell),
                {
                  type: 'richText',
                  label: false,
                  maxLength: SLIDE_LIMITS.table.cell.max,
                },
              ),
            ],
          }),
        ],
      }),
    ),
    factoryField('preview', 'preview', z.never(), false),
  ],
  promptMeta: {
    index: 9,
    heading: 'table',
    summary:
      'Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)',
    lines: [
      'eyebrow, title (obligatoire)',
      'tableVariant: "reference" (standard) | "matrix" (cellules de statut). Pour une matrice, mets ✓/⚠/✗ ou "ok"/"warn"/"blocked" dans les cellules de statut.',
      'columns: [{header}]',
      'rows: [{cells: [{value}]}] — chaque ligne a une cellule par colonne, dans le même ordre',
    ],
  },
});

export const tableRenderSchema = z.object({
  blockType: z.literal('table'),
  eyebrow,
  title,
  tableVariant,
  columns,
  rows,
});

export type TableBlockData = InferRender<typeof tableRenderSchema>;
