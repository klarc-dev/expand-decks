import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  aiSchemaOf,
  block,
  factoryField,
  optionalAi,
  rawField,
  type BlockSpec,
} from '../../dsl';
import { emitDraftSchema, emitSlidesArraySchema } from '../emitDraftSchema';

// ---------------------------------------------------------------------------
// Inline minimal specs (per-block spec files don't exist yet — later tasks).
// These reproduce the CURRENT AI shapes via the DSL builders. The `render`
// Zod is irrelevant for L3, so a placeholder is used; only `ai` matters here.
// ---------------------------------------------------------------------------

const render = z.string(); // placeholder render Zod (unused by aiSchemaOf)

const coverSpec: BlockSpec = block({
  slug: 'cover',
  labels: { singular: 'Cover', plural: 'Covers' },
  imageURL: '',
  aiDraftable: true,
  blockType: 'cover',
  fields: [
    factoryField('eyebrow', 'eyebrow', render, optionalAi(z.string())),
    factoryField('title', 'title', render, z.string()),
    rawField('subtitle', render, optionalAi(z.string()), { type: 'textarea' }),
    rawField('footerLeft', render, optionalAi(z.string()), { type: 'text' }),
    rawField('footerRight', render, optionalAi(z.string()), { type: 'text' }),
    factoryField(
      'surface',
      'surface',
      render,
      optionalAi(z.enum(['dark', 'light', 'gradient'])),
    ),
    // image / imagePosition are NOT AI-draftable (ai: false → dropped from L3).
    factoryField('image', 'image', render, false),
    rawField('imagePosition', render, false, { type: 'select' }),
    // preview carries no data and must never reach L3.
    factoryField('preview', 'preview', render, false),
  ],
});

const statementSpec: BlockSpec = block({
  slug: 'statement',
  labels: { singular: 'Statement', plural: 'Statements' },
  imageURL: '',
  aiDraftable: true,
  blockType: 'statement',
  fields: [
    factoryField('eyebrow', 'eyebrow', render, optionalAi(z.string())),
    factoryField('title', 'title', render, z.string()),
    rawField('body', render, optionalAi(z.string()), { type: 'textarea' }),
    rawField('footer', render, optionalAi(z.string()), { type: 'text' }),
  ],
});

const cardGridSpec: BlockSpec = block({
  slug: 'cardGrid',
  labels: { singular: 'Card grid', plural: 'Card grids' },
  imageURL: '',
  aiDraftable: true,
  blockType: 'cardGrid',
  fields: [
    factoryField('eyebrow', 'eyebrow', render, optionalAi(z.string())),
    factoryField('title', 'title', render, z.string()),
    rawField('sidebarText', render, optionalAi(z.string()), { type: 'textarea' }),
    rawField('columns', render, optionalAi(z.enum(['2', '3', '4'])), {
      type: 'select',
    }),
    rawField(
      'cards',
      render,
      optionalAi(
        z.array(
          z.object({
            number: z.string().optional(),
            title: z.string(),
            description: z.string().optional(),
          }),
        ),
      ),
      { type: 'array' },
    ),
  ],
});

// Non-draftable block — must be absent from the emitted union.
const markdownSpec: BlockSpec = block({
  slug: 'markdown',
  labels: { singular: 'Markdown', plural: 'Markdown' },
  imageURL: '',
  aiDraftable: false,
  blockType: 'markdown',
  fields: [rawField('content', render, false, { type: 'code', language: 'markdown' })],
});

const allSpecs = [coverSpec, statementSpec, cardGridSpec, markdownSpec];

// ---------------------------------------------------------------------------
// Current hand-written schemas, copied VERBATIM from route.ts (not exported).
// ---------------------------------------------------------------------------

const currentCoverSchema = z.object({
  blockType: z.literal('cover'),
  eyebrow: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  footerLeft: z.string().optional(),
  footerRight: z.string().optional(),
  surface: z.enum(['dark', 'light', 'gradient']).optional(),
});

const currentStatementSchema = z.object({
  blockType: z.literal('statement'),
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  footer: z.string().optional(),
});

const currentCardGridSchema = z.object({
  blockType: z.literal('cardGrid'),
  eyebrow: z.string().optional(),
  title: z.string(),
  sidebarText: z.string().optional(),
  columns: z.enum(['2', '3', '4']).optional(),
  cards: z
    .array(
      z.object({
        number: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'input' });

describe('emitDraftSchema() — per-block JSON Schema parity', () => {
  it('cover member matches the current hand-written cover schema', () => {
    expect(jsonSchema(aiSchemaOf(coverSpec))).toEqual(jsonSchema(currentCoverSchema));
  });

  it('statement member matches the current hand-written statement schema', () => {
    expect(jsonSchema(aiSchemaOf(statementSpec))).toEqual(
      jsonSchema(currentStatementSchema),
    );
  });

  it('cardGrid member matches the current hand-written cardGrid schema', () => {
    expect(jsonSchema(aiSchemaOf(cardGridSpec))).toEqual(
      jsonSchema(currentCardGridSchema),
    );
  });
});

describe('emitDraftSchema() — union shape', () => {
  it('serializes the union to anyOf (not oneOf, which OpenAI rejects)', () => {
    const js = jsonSchema(emitDraftSchema(allSpecs)) as Record<string, unknown>;
    expect(js).toHaveProperty('anyOf');
    expect(js).not.toHaveProperty('oneOf');
  });

  it('produces one union member per AI-draftable block (markdown excluded)', () => {
    const js = jsonSchema(emitDraftSchema(allSpecs)) as { anyOf: unknown[] };
    // cover, statement, cardGrid → 3 members; markdown is dropped.
    expect(js.anyOf).toHaveLength(3);
  });

  it('union member JSON Schemas equal the current hand-written members', () => {
    const emitted = jsonSchema(emitDraftSchema(allSpecs)) as { anyOf: unknown[] };
    const current = jsonSchema(
      z.union([currentCoverSchema, currentStatementSchema, currentCardGridSchema]),
    ) as { anyOf: unknown[] };
    expect(emitted.anyOf).toEqual(current.anyOf);
  });
});

describe('emitDraftSchema() — markdown exclusion', () => {
  it('omits markdown (aiDraftable: false) even when present in specs', () => {
    const js = jsonSchema(emitDraftSchema(allSpecs)) as { anyOf: unknown[] };
    const blockTypes = js.anyOf.map((member) => {
      const m = member as { properties?: { blockType?: { const?: string } } };
      return m.properties?.blockType?.const;
    });
    expect(blockTypes).not.toContain('markdown');
    expect(blockTypes.sort()).toEqual(['cardGrid', 'cover', 'statement']);
  });
});

describe('emitDraftSchema() — behavioral parity', () => {
  const emittedCover = aiSchemaOf(coverSpec);

  const validCover = {
    blockType: 'cover',
    eyebrow: 'TAG',
    title: 'Hello',
    subtitle: 'Sub',
    footerLeft: 'L',
    footerRight: 'R',
    surface: 'dark',
  };
  const coverMissingOptionals = { blockType: 'cover', title: 'Hello' };
  const invalidCoverNoTitle = { blockType: 'cover', eyebrow: 'TAG' };

  const fixtures: Array<{ name: string; value: unknown }> = [
    { name: 'valid cover', value: validCover },
    { name: 'cover missing optionals', value: coverMissingOptionals },
    { name: 'invalid cover missing title', value: invalidCoverNoTitle },
  ];

  for (const { name, value } of fixtures) {
    it(`parses "${name}" identically on emitted vs current`, () => {
      const emittedResult = emittedCover.safeParse(value);
      const currentResult = currentCoverSchema.safeParse(value);
      expect(emittedResult.success).toBe(currentResult.success);
      if (emittedResult.success && currentResult.success) {
        expect(emittedResult.data).toEqual(currentResult.data);
      }
    });
  }
});

describe('emitSlidesArraySchema()', () => {
  const schema = emitSlidesArraySchema(allSpecs);
  const currentSlidesArraySchema = z.object({
    slides: z
      .array(z.union([currentCoverSchema, currentStatementSchema, currentCardGridSchema]))
      .min(3)
      .max(20),
  });

  it('matches the current slidesArraySchema JSON Schema', () => {
    expect(jsonSchema(schema)).toEqual(jsonSchema(currentSlidesArraySchema));
  });

  it('enforces the 3..20 slide bounds', () => {
    const slide = { blockType: 'cover', title: 'X' };
    expect(schema.safeParse({ slides: [slide, slide] }).success).toBe(false);
    expect(schema.safeParse({ slides: [slide, slide, slide] }).success).toBe(true);
    const tooMany = Array.from({ length: 21 }, () => slide);
    expect(schema.safeParse({ slides: tooMany }).success).toBe(false);
  });
});
