import { z } from 'zod';

// The rest of the block is template-specific and validated after hydration.
export const slidePreviewRequestSchema = z.object({
  presentationId: z.union([z.string().min(1), z.number()]),
  block: z.object({ blockType: z.string().min(1) }).catchall(z.unknown()),
  fields: z.record(z.string(), z.unknown()).optional(),
  previewFieldPath: z.string().optional(),
  blockTypes: z.array(z.string()).optional(),
  sections: z.array(z.string()).optional(),
  slideIndex: z.number().optional(),
  includeLayoutCandidates: z.boolean().optional(),
  slideRefs: z
    .array(
      z.object({
        id: z.string().nullish(),
        blockType: z.string(),
        title: z.string().nullish(),
      }),
    )
    .optional(),
});

export type SlidePreviewRequest = z.infer<typeof slidePreviewRequestSchema>;
