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
  footnotesField,
  imageFields,
  previewField,
  slideRichTextEditor,
  titleField,
} from '../../_shared';
import type { FieldSpec, BlockSpec, PayloadFieldMeta } from '../dsl';

function emitAdminMeta(payload: PayloadFieldMeta): Record<string, unknown> {
  const admin: Record<string, unknown> = { description: payload.description };

  if (payload.language !== undefined) admin.language = payload.language;
  if (payload.adminCondition) {
    admin.condition = (_: unknown, siblingData: { image?: unknown }) => Boolean(siblingData?.image);
  }
  if (payload.adminFieldComponent) admin.components = { Field: payload.adminFieldComponent };
  if (payload.adminHidden !== undefined) admin.hidden = payload.adminHidden;
  if (payload.initCollapsed !== undefined) admin.initCollapsed = payload.initCollapsed;
  // Every repeater item gets a row label derived from its own text fields
  // (instead of the default "Card 01 / Row 01") — see RepeaterRowLabel.
  if (payload.type === 'array' && !payload.adminFieldComponent) {
    admin.components = { RowLabel: '/components/RepeaterRowLabel#default' };
  }

  return admin;
}

function assignDefined(
  target: Record<string, unknown>,
  source: PayloadFieldMeta,
  keys: Array<keyof PayloadFieldMeta>,
): void {
  for (const key of keys) {
    if (source[key] !== undefined) target[key] = source[key];
  }
}

/** Build a single `raw` Field from its plain Payload metadata. */
function emitRawField(field: FieldSpec): Field {
  const payload = field.payload as PayloadFieldMeta;

  const result: Record<string, unknown> = {
    name: field.name,
    type: payload.type,
    label: payload.label,
    admin: emitAdminMeta(payload),
  };
  if (payload.required) result.required = true;
  if (payload.access === 'isAdminField') {
    result.access = { create: isAdminField, update: isAdminField };
  }
  assignDefined(result, payload, [
    'defaultValue',
    'options',
    'relationTo',
    'hasMany',
    'maxDepth',
    'minRows',
    'maxRows',
    'labels',
    'validate',
  ]);
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
  // Blocks with a `title` field get a custom collapsed-header label derived
  // from that title (instead of the default "Untitled"). Title-less blocks
  // keep Payload's default label.
  const hasTitle = spec.fields.some((f) => f.factory === 'title');

  // Every block except `markdown` and `cover` gets the shared "Sources / Notes"
  // repeater. Cover/title slides should stay presentation metadata, not source
  // carriers. It carries no render/AI data (no renderer reads it; buildSlidesMd
  // seeds the footnote band directly from the Payload value), so it is injected
  // here at L1 only — once — instead of in 11 spec field arrays. Placed before
  // any trailing `preview` UI field so the form ends on the live preview.
  const fields = spec.fields.flatMap(emitField);
  if (spec.slug !== 'markdown' && spec.slug !== 'cover') {
    const previewIdx = fields.findIndex((f) => 'name' in f && f.name === 'preview');
    const note = footnotesField();
    if (previewIdx === -1) fields.push(note);
    else fields.splice(previewIdx, 0, note);
  }

  return {
    slug: spec.slug,
    labels: spec.labels,
    imageURL: spec.imageURL,
    fields,
    ...(hasTitle ? { admin: { components: { Label: '/components/SlideRowLabel#default' } } } : {}),
  };
}
