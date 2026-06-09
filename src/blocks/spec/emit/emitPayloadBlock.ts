/**
 * L1 emitter — derive a Payload `Block` config from a `BlockSpec`.
 *
 * This is the SERVER-ONLY counterpart to the client-safe `dsl.ts`: it is the
 * single place allowed to touch the Payload runtime and the `_shared`
 * factories. It walks `spec.fields`, dispatching each `FieldSpec` by its
 * `factory` to either a `_shared` factory call or a hand-built `Field` from the
 * plain `payload` metadata. The output is byte-identical to the current
 * hand-written `*Block.ts` files (proven in `__tests__/emitPayloadBlock.test.ts`).
 */
import type { Block, Field } from 'payload';

import { isAdminField } from '../../../access/roles';
import {
  cardTitleDescFields,
  eyebrowField,
  imageFields,
  previewField,
  slideRichTextEditor,
  surfaceField,
  titleField,
} from '../../_shared';
import type { FieldSpec, BlockSpec, PayloadFieldMeta } from '../dsl';

/** Build a single `raw` Field from its plain Payload metadata. */
function emitRawField(field: FieldSpec): Field {
  const payload = field.payload as PayloadFieldMeta;

  const admin: Record<string, unknown> = {};
  if (payload.language !== undefined) admin.language = payload.language;
  admin.description = payload.description;
  if (payload.adminCondition) {
    admin.condition = (_: unknown, siblingData: { image?: unknown }) => Boolean(siblingData?.image);
  }

  const result: Record<string, unknown> = {
    name: field.name,
    type: payload.type,
  };
  if (payload.required) result.required = true;
  result.label = payload.label;
  if (payload.defaultValue !== undefined) result.defaultValue = payload.defaultValue;
  if (payload.access === 'isAdminField') {
    result.access = { create: isAdminField, update: isAdminField };
  }
  result.admin = admin;
  if (payload.options !== undefined) result.options = payload.options;
  if (payload.type === 'array' && payload.fields !== undefined) {
    result.fields = payload.fields.flatMap(emitField);
  }
  if (payload.type === 'richText') result.editor = slideRichTextEditor;

  return result as unknown as Field;
}

/** Dispatch one `FieldSpec` to the Field(s) it produces. */
function emitField(field: FieldSpec): Field[] {
  switch (field.factory) {
    case 'eyebrow':
      return [
        field.factoryArgs?.description !== undefined
          ? eyebrowField(field.factoryArgs.description)
          : eyebrowField(),
      ];
    case 'title':
      return [titleField(field.factoryArgs!.description!)];
    case 'surface':
      return [surfaceField(field.factoryArgs?.gradient ? { gradient: true } : undefined)];
    case 'image':
      return imageFields(field.factoryArgs?.description);
    case 'cardTitleDesc':
      return cardTitleDescFields();
    case 'preview':
      return [previewField];
    case 'raw':
      return [emitRawField(field)];
  }
}

/** Emit a Payload `Block` from a `BlockSpec`. */
export function emitPayloadBlock(spec: BlockSpec): Block {
  return {
    slug: spec.slug,
    labels: spec.labels,
    imageURL: spec.imageURL,
    fields: spec.fields.flatMap(emitField),
  };
}
