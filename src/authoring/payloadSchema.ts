import type { Block, Field } from 'payload';
import { z } from 'zod';

export const recordIdSchema = z.int().positive();
const rowIdSchema = z.union([recordIdSchema, z.string().min(1).max(128)]);

function boundedArray(
  schema: z.ZodType,
  { minRows, maxRows }: { minRows?: number; maxRows?: number },
) {
  let array = z.array(schema);
  if (minRows !== undefined) array = array.min(minRows);
  if (maxRows !== undefined) array = array.max(maxRows);
  return array;
}

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field): Field[] => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) =>
        'name' in tab ? [{ ...tab, type: 'group' }] : flattenFields(tab.fields),
      );
    }
    if (field.type === 'row' || field.type === 'collapsible') return flattenFields(field.fields);
    return [field];
  });
}

export function payloadBlockSchema(block: Block, partial = false) {
  return z.strictObject({
    ...payloadFieldShape(block.fields, { partial }),
    blockType: z.literal(block.slug),
  });
}

function boundedNumber({ min, max }: { min?: number; max?: number }) {
  let schema = z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
}

function fieldSchema(field: Field): z.ZodType {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'code': {
      const schema = z.string();
      return 'maxLength' in field && field.maxLength !== undefined
        ? schema.max(field.maxLength)
        : schema;
    }
    case 'checkbox':
      return z.boolean();
    case 'number':
      return boundedNumber(field);
    case 'select':
    case 'radio':
      return z.enum(
        field.options.map((option) => (typeof option === 'string' ? option : option.value)),
      );
    case 'relationship':
    case 'upload':
      if (Array.isArray(field.relationTo)) {
        return z.strictObject({ relationTo: z.enum(field.relationTo), value: recordIdSchema });
      }
      return recordIdSchema;
    case 'richText':
      return z
        .looseObject({
          root: z.looseObject({
            type: z.literal('root'),
            children: z.array(z.looseObject({ type: z.string() })),
          }),
        })
        .describe('Payload Lexical editor state, not Markdown.');
    case 'array':
      return boundedArray(
        z.strictObject({
          ...payloadFieldShape(field.fields),
          id: rowIdSchema.optional(),
        }),
        field,
      );
    case 'group':
      return z.strictObject(payloadFieldShape(field.fields));
    case 'blocks': {
      const [first, ...variants] = field.blocks.map((block) =>
        payloadBlockSchema(block).extend({
          id: rowIdSchema.optional(),
          blockName: z.string().nullish(),
        }),
      );
      if (!first) throw new Error(`No blocks available for ${field.name}`);
      return boundedArray(z.discriminatedUnion('blockType', [first, ...variants]), field);
    }
    default:
      throw new Error(
        `Unsupported authoring field: ${'name' in field ? field.name : field.type} (${field.type})`,
      );
  }
}

function writableFieldSchema(field: Field, partial: boolean) {
  let schema = fieldSchema(field);
  if ('hasMany' in field && field.hasMany) {
    schema = boundedArray(schema, {
      minRows: 'minRows' in field ? field.minRows : undefined,
      maxRows: 'maxRows' in field ? field.maxRows : undefined,
    });
  }
  if (!('required' in field && field.required)) schema = schema.nullish();
  else if (partial || 'defaultValue' in field) schema = schema.optional();
  const label = field.admin && 'description' in field.admin && field.admin.description;
  return typeof label === 'string' ? schema.describe(label) : schema;
}

/** Project writable transport fields only. Payload still owns access, hooks and semantic validation. */
export function payloadFieldShape(
  fields: Field[],
  options: { pick?: readonly string[]; partial?: boolean } = {},
): z.ZodRawShape {
  const shape: Record<string, z.ZodType> = {};
  const pick = options.pick ? new Set(options.pick) : null;
  for (const field of flattenFields(fields)) {
    if (!('name' in field) || field.type === 'ui' || field.admin?.hidden || field.admin?.readOnly)
      continue;
    if (pick && !pick.delete(field.name)) continue;
    shape[field.name] = writableFieldSchema(field, options.partial ?? false);
  }
  if (pick?.size) throw new Error(`Unknown or readonly Payload fields: ${[...pick].join(', ')}`);
  return shape;
}
