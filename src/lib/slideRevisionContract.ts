import { z } from 'zod';

export const slideRevisionSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  slideIndex: z.number().int().min(0),
  instruction: z.string().trim().min(3).max(5000),
});
