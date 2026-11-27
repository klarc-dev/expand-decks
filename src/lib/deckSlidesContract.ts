import { createHash } from 'node:crypto';
import { z } from 'zod';

import { recordIdSchema } from '@/authoring/payloadSchema';
import { slideInputSchema, slidePatchSchema } from '@/authoring/slideSchema';

const deck = { deckId: recordIdSchema.max(2_147_483_647) };
const target = { ...deck, slideId: z.string().min(1).max(128) };
export const readDeckSlidesQuerySchema = z.strictObject({
  ...deck,
  slideId: target.slideId.optional(),
});
export function parseReadDeckSlidesQuery(params: URLSearchParams) {
  const deckId = params.get('deckId') ?? '';
  if (params.getAll('deckId').length !== 1 || params.getAll('slideId').length > 1) return null;
  const parsed = readDeckSlidesQuerySchema.safeParse({
    ...Object.fromEntries(params),
    deckId: /^[0-9]+$/.test(deckId) ? Number(deckId) : undefined,
  });
  return parsed.success ? parsed.data : null;
}

const revision = { expectedRevision: z.string().regex(/^[0-9a-f]{64}$/) };
const index = z.int().min(0).describe('Zero-based destination; for move, the final index.');

// Actual deletion is not a public JSON command. The browser approval handler
// calls the internal operation after verifying the signed confirmation.
export const deckSlidesCommandSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('insert'),
    ...deck,
    ...revision,
    index,
    slide: slideInputSchema,
  }),
  z.strictObject({ action: z.literal('update'), ...target, ...revision, patch: slidePatchSchema }),
  z.strictObject({ action: z.literal('move'), ...target, ...revision, index }),
  z.strictObject({ action: z.literal('prepare-delete'), ...target, ...revision }),
]);

// Keep previously issued POST reads working without advertising them on the write tool.
export const deckSlidesPostSchema = z.union([
  deckSlidesCommandSchema,
  z.strictObject({ action: z.literal('list'), ...deck }),
  z.strictObject({ action: z.literal('get'), ...target }),
]);

export type DeckSlidesCommand = z.infer<typeof deckSlidesCommandSchema>;
export type ReadDeckSlidesQuery = z.infer<typeof readDeckSlidesQuerySchema>;

function sortKeys(_key: string, value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
}

/** Compare authored slide contents, stable IDs, ordering and governing template, not build status. */
export function deckSlidesRevision(slides: readonly unknown[], documentTemplate: string): string {
  return createHash('sha256')
    .update(JSON.stringify([documentTemplate, slides], sortKeys))
    .digest('hex');
}
