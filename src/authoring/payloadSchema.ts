import type { Block, Field } from 'payload';
import { z } from 'zod';

export const recordIdSchema = z.int().positive();
const rowIdSchema = z.union([recordIdSchema, z.string().min(1).max(128)]);

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
    case 'number': {
      let schema = z.number();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      return schema;
    }
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
    case 'array': {
      let schema = z.array(
        z.strictObject({
          ...payloadFieldShape(field.fields),
          id: rowIdSchema.optional(),
        }),
      );
      if (field.minRows !== undefined) schema = schema.min(field.minRows);
      if (field.maxRows !== undefined) schema = schema.max(field.maxRows);
      return schema;
    }
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
      let schema = z.array(z.discriminatedUnion('blockType', [first, ...variants]));
      if (field.minRows !== undefined) schema = schema.min(field.minRows);
      if (field.maxRows !== undefined) schema = schema.max(field.maxRows);
      return schema;
    }
    default:
      throw new Error(
        `Unsupported authoring field: ${'name' in field ? field.name : field.type} (${field.type})`,
      );
  }
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
    let schema = fieldSchema(field);
    if ('hasMany' in field && field.hasMany) {
      let items = z.array(schema);
      if ('minRows' in field && field.minRows !== undefined) items = items.min(field.minRows);
      if ('maxRows' in field && field.maxRows !== undefined) items = items.max(field.maxRows);
      schema = items;
    }
    if (!('required' in field && field.required)) schema = schema.nullish();
    else if (options.partial || 'defaultValue' in field) schema = schema.optional();
    const label = field.admin && 'description' in field.admin && field.admin.description;
    shape[field.name] = typeof label === 'string' ? schema.describe(label) : schema;
  }
  if (pick?.size) throw new Error(`Unknown or readonly Payload fields: ${[...pick].join(', ')}`);
  return shape;
}
