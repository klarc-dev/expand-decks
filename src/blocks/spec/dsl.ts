/**
 * Block spec DSL — single source of truth for the 9 layout blocks.
 *
 * This file defines the *contract* (types) and pure *projection helpers* that
 * later waves of the refactor use to derive everything else from one place:
 *
 *   L1  Payload field configs   ← emitted from `FieldSpec.factory` / `.payload`
 *   L2  Renderer TS types       ← `z.infer<renderSchemaOf(spec)>`
 *   L3  Zod AI-draft schemas    ← `aiSchemaOf(spec)`
 *   L4  Prompt prose bullets    ← `BlockSpec.promptMeta`
 *
 * Render / AI duality
 * -------------------
 * Each field carries TWO Zod schemas because the render side and the AI side
 * have intentionally different optional semantics:
 *
 *   - `render`: the RENDER-facing Zod (drives L2 via z.infer). An OPTIONAL
 *     field uses `z.nullable(T).optional()` so it infers to `prop?: T | null`,
 *     matching the existing hand-written `*BlockData` types and the tests that
 *     pass an explicit `null`. Required fields are plain (e.g. `z.string()`).
 *
 *   - `ai`: the AI-draft-facing Zod, OR `false` when the field is not
 *     AI-draftable (then it is dropped from L3). OpenAI structured output runs
 *     with `strictJsonSchema: false`, so AI optionals use plain `.optional()`
 *     (NOT `.nullable()` / `.nullish()`). `false` is used for
 *     image / imagePosition / preview.
 *
 * Spec-file ergonomics (how next-wave agents author a `<name>.ts` spec)
 * --------------------------------------------------------------------
 * Each per-field `render` Zod is the single source of truth for that field's
 * data shape. A spec file authors fields ONCE — naming the `render` Zod in a
 * `const` — then reuses those same Zod values in two exports:
 *
 *   1. the `BlockSpec` (field array; SSOT for the emit/L1/L3/L4 waves), and
 *   2. a precise `renderSchema` `z.object({...})` literal, so `z.infer` keeps
 *      the exact per-field types (see "Why two exports" below).
 *
 *   const eyebrow = optionalRender(z.string());
 *   const title = z.string();
 *   // …one const per field…
 *
 *   export const coverSpec = block({
 *     slug: 'cover', blockType: 'cover', aiDraftable: true, …,
 *     fields: [
 *       factoryField('eyebrow', 'eyebrow', eyebrow, optionalAi(z.string()), { … }),
 *       factoryField('title', 'title', title, z.string(), { … }),
 *       // …
 *     ],
 *   });
 *
 *   // Precise render schema — reuses the SAME render Zods, by name.
 *   export const coverRenderSchema = z.object({
 *     blockType: z.literal('cover'),
 *     eyebrow, title, // …
 *   });
 *   export type CoverBlockData = InferRender<typeof coverRenderSchema>;
 *
 * Why two exports (the one subtle point)
 * --------------------------------------
 * `renderSchemaOf(spec)` builds a render `z.object` at RUNTIME by iterating the
 * field array. That works for iteration/validation, but TypeScript erases the
 * per-field shape across the loop, so its `z.infer` widens to a loose object —
 * unusable as `CoverBlockData`. The `z.object({...})` LITERAL preserves the
 * shape as a value, so its `z.infer` is exact (verified mutually assignable
 * with the hand-written `*BlockData`). Both are driven by the same `render`
 * Zod consts, so they cannot drift; task A4 asserts `renderSchemaOf(spec)`
 * matches the exported literal's shape.
 *
 * Client-safety
 * -------------
 * This file imports ONLY zod. It must NEVER pull in the Payload runtime, the
 * Next.js runtime, or `../_shared` — it is loaded transitively into
 * `'use client'` renderer types. Payload field metadata for `raw` fields is
 * carried here as plain data and consumed by the (later) emitter, which is the
 * only place allowed to touch `_shared` / Payload types.
 */

import { z } from 'zod';

import { SLIDE_LIMITS, type RangeLimit, type TextLimit } from './limits';
import { serializedTextLength } from './limitValidation';

// ---------------------------------------------------------------------------
// Field-level contract
// ---------------------------------------------------------------------------

/**
 * Tells the LATER Payload emitter how to build the admin Field for a spec:
 * either call a `_shared` factory of the matching name, or assemble the Field
 * from the plain `payload` metadata when `factory: 'raw'`.
 */
export type FieldFactory = 'eyebrow' | 'title' | 'image' | 'preview' | 'cardTitleDesc' | 'raw';

export const limitedString = (limit: TextLimit) => z.string().max(limit.max);
export const nonBlankLimitedString = (limit: TextLimit) => z.string().trim().min(1).max(limit.max);

export const optionalLimitedRender = (limit: TextLimit) => optionalRender(limitedString(limit));

export const optionalLimitedAi = (limit: TextLimit) => optionalAi(limitedString(limit));

export const limitedArray = <T extends z.ZodType>(item: T, limit: RangeLimit) =>
  z.array(item).min(limit.min).max(limit.max);

/** Render-facing optional that infers as `prop?: T | null`. */
export const optionalRender = <T extends z.ZodType>(inner: T) => z.nullable(inner).optional();

/** AI-facing optional (plain `.optional()`, no null) per strictJsonSchema:false. */
export const optionalAi = <T extends z.ZodType>(inner: T) => inner.optional();

// Render Zod for a rich-text (Lexical) field. The type-only import is erased at
// compile time, so dsl.ts stays client-safe (zod only). The unconstrained form
// only shapes InferRender; limited fields add visible-text validation.
export type LexicalRichText = import('@payloadcms/richtext-lexical/lexical').SerializedEditorState;
export const richTextRender = () => z.custom<LexicalRichText>();
export const optionalRichTextRender = () => z.custom<LexicalRichText>().nullable().optional();
export const optionalUnknownRender = () => z.unknown().nullable().optional();
const footnote = z.object({ text: limitedString(SLIDE_LIMITS.common.footnotes.text) });
const aiFootnote = z.object({ text: limitedString(SLIDE_LIMITS.common.footnotes.text) });
export const footnotesRender = () =>
  optionalRender(limitedArray(footnote, SLIDE_LIMITS.common.footnotes));
export const footnotesAi = () =>
  optionalAi(limitedArray(aiFootnote, SLIDE_LIMITS.common.footnotes));
export const limitedRichTextRender = (limit: TextLimit) =>
  z
    .custom<LexicalRichText>()
    .refine(
      (value) => serializedTextLength(value) <= limit.max,
      `Maximum ${limit.max} caractères visibles`,
    );
export const optionalLimitedRichTextRender = (limit: TextLimit) =>
  limitedRichTextRender(limit).nullable().optional();

/** Payload field `type` values the emitter knows how to build from raw meta. */
export type PayloadRawType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'code'
  | 'array'
  | 'richText'
  | 'relationship'
  | 'number';

/** A single `{ label, value }` option for a Payload `select` field. */
export interface PayloadOption {
  label: string;
  value: string;
}

/**
 * Plain (Payload-free) metadata describing a `raw` field or factory arguments.
 *
 * For `factory: 'raw'` fields the emitter reads `type` + the matching keys to
 * construct the admin Field. For factory fields, only `factoryArgs` is relevant
 * (e.g. eyebrow or image description);
 * it is also surfaced on `FieldSpec.factoryArgs` for convenience.
 *
 * This is deliberately permissive-but-typed: the emitter owns the actual
 * Payload construction, this only carries data.
 */
export interface PayloadFieldMeta {
  type?: PayloadRawType;
  label?: string | false;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  options?: PayloadOption[];
  /** Code editor language for `type: 'code'` (e.g. 'yaml', 'markdown'). */
  language?: string;
  /** When true the emitter wires an admin `condition` (e.g. show-if-image). */
  adminCondition?: boolean;
  /** Named access guard the emitter applies (currently only admin-only). */
  access?: 'isAdminField';
  /** Nested field specs for `type: 'array'` blocks. */
  fields?: FieldSpec[];
  /** Relationship target collection slug for `type: 'relationship'` fields. */
  relationTo?: string;
  /** Allow selecting multiple relationship values. */
  hasMany?: boolean;
  /** Maximum population depth for relationships. */
  maxDepth?: number;
  /** Minimum rows for `type: 'array'` fields. */
  minRows?: number;
  /** Maximum rows for `type: 'array'` fields. */
  maxRows?: number;
  /**
   * Canonical visible-text/code length. Emitted as native Payload maxLength for
   * plain text-like fields and as a composed validator for serialized rich text.
   */
  maxLength?: number;
  /** Singular/plural labels for `type: 'array'` fields. */
  labels?: { singular: string; plural: string };
  /** Custom client field component emitted into `admin.components.Field`. */
  adminFieldComponent?: string;
  /** Hide the native field UI while retaining the field in form state. */
  adminHidden?: boolean;
  /** Initial collapsed state for native array rows. */
  initCollapsed?: boolean;
  /** Custom Payload validator retained by the emitted field. */
  validate?: unknown;
  /** Args forwarded to the named `_shared` factory for factory fields. */
  factoryArgs?: FactoryArgs;
}

/** Arguments forwarded to a `_shared` factory (superset across factories). */
export interface FactoryArgs {
  description?: string;
  maxLength?: number;
  titleMaxLength?: number;
  descriptionMaxLength?: number;
}

export function limitedTextPayload(
  limit: TextLimit,
  payload: Omit<PayloadFieldMeta, 'maxLength'>,
): PayloadFieldMeta {
  return { ...payload, maxLength: limit.max };
}

export function limitedArrayPayload(
  limit: RangeLimit,
  payload: Omit<PayloadFieldMeta, 'minRows' | 'maxRows'>,
): PayloadFieldMeta {
  return { ...payload, minRows: limit.min, maxRows: limit.max };
}

/**
 * Per-field spec pairing the Payload emit strategy with the render/AI Zod.
 *
 * `render` is always present (every field renders). `ai` is a Zod schema when
 * AI-draftable, or `false` to drop the field from L3.
 */
export interface FieldSpec {
  name: string;
  factory: FieldFactory;
  /** RENDER-facing Zod — drives L2 via z.infer. Optionals: optionalRender(T). */
  render: z.ZodType;
  /** AI-facing Zod, or `false` when the field is not AI-draftable. */
  ai: z.ZodType | false;
  /** Plain metadata for `raw` fields (emitter builds the Payload Field). */
  payload?: PayloadFieldMeta;
  /** Args for the named `_shared` factory (factory fields only). */
  factoryArgs?: FactoryArgs;
}

// ---------------------------------------------------------------------------
// Block-level contract
// ---------------------------------------------------------------------------

/** Per-block prose record the L4 emitter turns into "N. **slug** — …" bullets. */
export interface PromptMeta {
  /** 1-based position in the prompt's numbered layout list. */
  index: number;
  /** Bold heading text after the number (typically the slug). */
  heading: string;
  /** Short layout description shown after the em dash. */
  summary: string;
  /** Per-field bullet lines (already prose, e.g. "title: titre (obligatoire)"). */
  lines: string[];
}

function fieldLimitSuffix(field: FieldSpec): string | undefined {
  const payload = field.payload;
  const maxLength = payload?.maxLength ?? field.factoryArgs?.maxLength;
  const rowRange =
    payload?.minRows !== undefined || payload?.maxRows !== undefined
      ? [payload.minRows, payload.maxRows]
          .filter((value): value is number => value !== undefined)
          .join('–')
      : undefined;
  if (rowRange) return `${field.name}: ${rowRange} éléments`;
  if (maxLength !== undefined) return `${field.name}: ${maxLength} caractères max`;
  return undefined;
}

export function promptLinesOf(spec: BlockSpec): string[] {
  const authored = spec.promptMeta?.lines ?? [];
  const limits = spec.fields.flatMap((field) => {
    if (field.ai === false || field.factory === 'preview') return [];
    const suffix = fieldLimitSuffix(field);
    return suffix ? [suffix] : [];
  });
  return [...authored, ...limits];
}

/**
 * Block-level spec. `fields` order is LOAD-BEARING: it determines field order in
 * the generated Payload `Block` and therefore the shape of payload-types.ts.
 */
export interface BlockSpec {
  slug: string;
  labels: { singular: string; plural: string };
  imageURL: string;
  /** When false the whole block is dropped from L3 (AI) and L4 (prompt). */
  aiDraftable: boolean;
  /** Literal tag emitted as `blockType: z.literal(blockType)` (e.g. 'cover'). */
  blockType: string;
  /** ORDERED list of field specs. */
  fields: FieldSpec[];
  /** Optional cross-field refinement over the AI object projected from fields. */
  aiRefine?: (schema: z.ZodObject) => z.ZodType;
  /** Optional render-only cross-field refinement. */
  renderRefine?: (schema: z.ZodObject) => z.ZodType;
  /** Optional prose record for L4 prompt generation. */
  promptMeta?: PromptMeta;
}

// ---------------------------------------------------------------------------
// Authoring builders
// ---------------------------------------------------------------------------

/**
 * Author a `raw` field. `render` drives L2; `ai` is the AI Zod or `false`.
 * `payload` carries the metadata the emitter needs to build the admin Field.
 */
export function rawField(
  name: string,
  render: z.ZodType,
  ai: z.ZodType | false,
  payload: PayloadFieldMeta,
): FieldSpec {
  return { name, factory: 'raw', render, ai, payload };
}

/**
 * Author a factory-backed field (eyebrow/title/image/preview/
 * cardTitleDesc). The emitter calls the matching `_shared` factory with
 * `factoryArgs`; `render`/`ai` still define the data contract.
 */
export function factoryField(
  name: string,
  factory: Exclude<FieldFactory, 'raw'>,
  render: z.ZodType,
  ai: z.ZodType | false,
  factoryArgs?: FactoryArgs,
): FieldSpec {
  return {
    name,
    factory,
    render,
    ai,
    ...(factoryArgs ? { factoryArgs } : {}),
  };
}

/** Assemble a `BlockSpec`. Thin identity helper for inference at the call site. */
export function block(spec: BlockSpec): BlockSpec {
  return spec;
}

// ---------------------------------------------------------------------------
// Header-field factories (U7) — eyebrow/title fields are declared
// identically across nearly every spec. These return the exact same FieldSpec
// the inline `factoryField(...)` calls produced, so render/AI key sets cannot
// drift and the spec files stop copy-pasting. Byte-identical emission is the
// gate (allSpecs.parity + generate:types zero-diff).
// ---------------------------------------------------------------------------

/** `eyebrow` field: render Zod + AI optional string. `description` → factoryArgs. */
export function eyebrowFieldSpec(
  render: z.ZodType = optionalLimitedRender(SLIDE_LIMITS.common.eyebrow),
  description?: string,
): FieldSpec {
  return factoryField(
    'eyebrow',
    'eyebrow',
    render,
    optionalLimitedAi(SLIDE_LIMITS.common.eyebrow),
    { description, maxLength: SLIDE_LIMITS.common.eyebrow.max },
  );
}

/** Audience-facing title text is a concise headline, not inline Markdown. */
export const aiTitle = () =>
  nonBlankLimitedString(SLIDE_LIMITS.common.title)
    .refine(
      (value) => !/(?:\*\*|__|~~|`|!?\[[^\]]+\]\([^)]+\)|^\s{0,3}#{1,6}\s|^\s*>\s)/mu.test(value),
      'Le titre doit être du texte brut sans balisage Markdown (gras, italique, lien, code, citation ou titre Markdown)',
    )
    .refine(
      (value) => !/[.!?…]\s*$/u.test(value),
      'Le titre doit être concis et sans ponctuation de fin de phrase',
    );

/** `title` field: render Zod + required AI plain-text title. `description` → factoryArgs. */
export function titleFieldSpec(render: z.ZodType, description?: string): FieldSpec {
  return factoryField('title', 'title', render, aiTitle(), {
    description,
    maxLength: SLIDE_LIMITS.common.title.max,
  });
}

// ---------------------------------------------------------------------------
// Projection helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Build the RENDER Zod object: every non-preview field's `render`, plus a
 * `blockType: z.literal(spec.blockType)` discriminant. `factory: 'preview'`
 * fields are excluded (preview is L1-only and carries no data).
 *
 * RUNTIME helper: the per-field shape is erased across the loop, so its
 * `z.infer` widens to a loose object. For PRECISE render types a spec file
 * exports a `z.object({...})` literal instead (see the top-of-file ergonomics
 * note); this helper is for validation/iteration and A4's drift check.
 */
export function renderSchemaOf(spec: BlockSpec): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {
    blockType: z.literal(spec.blockType),
  };
  for (const field of spec.fields) {
    if (field.factory === 'preview') continue;
    shape[field.name] = field.render;
  }
  if (spec.slug !== 'markdown' && spec.slug !== 'cover') {
    shape.footnotes = footnotesRender();
  }
  const schema = z.object(shape);
  return (spec.renderRefine ? spec.renderRefine(schema) : schema) as z.ZodType<
    Record<string, unknown>
  >;
}

/**
 * Build the AI-draft Zod object: `blockType` literal plus every field whose
 * `ai` is a Zod schema. Fields with `ai: false` and `factory: 'preview'` are
 * dropped. Used by the later `emitDraftSchema`.
 */
export function aiSchemaOf(spec: BlockSpec): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType> = {
    blockType: z.literal(spec.blockType),
  };
  for (const field of spec.fields) {
    if (field.factory === 'preview') continue;
    if (field.ai === false) continue;
    shape[field.name] = field.ai;
  }
  if (spec.slug !== 'markdown' && spec.slug !== 'cover') {
    shape.footnotes = footnotesAi();
  }
  const schema = z.object(shape);
  return (spec.aiRefine ? spec.aiRefine(schema) : schema) as z.ZodType<Record<string, unknown>>;
}

/**
 * Render-data type for a precise render schema value (a `z.object` literal).
 *
 * Usage in a spec file:
 *   export const coverRenderSchema = z.object({ blockType: z.literal('cover'), … });
 *   export type CoverBlockData = InferRender<typeof coverRenderSchema>;
 */
export type InferRender<TSchema extends z.ZodType> = z.infer<TSchema>;
