import { z } from 'zod';

const id = z.union([z.string().min(1).max(128), z.number()]);
const index = z.number().int().min(0);

export const slideLayoutCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('analyze'), deckId: id, slideIndex: index }),
  z.object({ action: z.literal('recommend'), deckId: id, slideIndex: index }),
  z.object({
    action: z.literal('preview'),
    deckId: id,
    slideIndex: index,
    targetLayout: z.string().min(1),
  }),
  z.object({
    action: z.literal('apply'),
    deckId: id,
    slideIndex: index,
    targetLayout: z.string().min(1),
    expectedFingerprint: z.string().length(64),
    confirmLossy: z.boolean().optional(),
    mapping: z
      .object({
        collectionSide: z.enum(['left', 'right']).optional(),
        collectionSourceField: z.string().optional(),
        proseSourceField: z.string().optional(),
      })
      .optional(),
    draft: z
      .object({
        slideId: z.union([z.string(), z.number()]).nullable(),
        slide: z.record(z.string(), z.unknown()),
      })
      .optional(),
  }),
  z.object({
    action: z.literal('undo-layout'),
    deckId: id,
    slideIndex: index,
    undoToken: z.string().min(1),
    expectedFingerprint: z.string().length(64),
  }),
]);

export type SlideLayoutCommand = z.infer<typeof slideLayoutCommandSchema>;
