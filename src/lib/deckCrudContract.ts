import { z } from 'zod';

import { WRITABLE_SLIDE_SCHEMA } from '@/blocks/spec';

const deckId = z.union([z.string().min(1).max(128), z.number()]);
const index = z.number().int().min(0);

export const slideRevisionSchema = z.object({
  presentationId: deckId,
  slideIndex: index,
  instruction: z.string().trim().min(3).max(5000),
});

export const slideMutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    deckId,
    index: index.optional(),
    slide: WRITABLE_SLIDE_SCHEMA,
  }),
  z.object({
    action: z.literal('update'),
    deckId,
    slideIndex: index,
    slide: WRITABLE_SLIDE_SCHEMA,
  }),
  z.object({ action: z.literal('delete'), deckId, slideIndex: index }),
  z.object({ action: z.literal('move'), deckId, slideIndex: index, toIndex: index }),
]);
