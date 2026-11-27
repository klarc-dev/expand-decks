import { z } from 'zod';

// Payload's configured PostgreSQL adapter uses serial IDs.
export const presentationBuildIdSchema = z.number().int().positive().max(2_147_483_647);

export const presentationBuildResponseSchema = z.strictObject({
  queued: z.literal(true),
  buildToken: z.uuid(),
  lastBuildStatus: z.literal('building'),
  lastBuildRequestedAt: z.iso.datetime(),
});

export const deckDeletionRequestSchema = z.strictObject({ deckId: presentationBuildIdSchema });

export const knowledgeDeletionRequestSchema = z.strictObject({
  collection: z.enum(['knowledge-bases', 'knowledge-documents']),
  id: presentationBuildIdSchema,
});

export const deletionConfirmationPath = '/api/deck-actions';

export const destructiveConfirmationResponseSchema = z.strictObject({
  confirmationUrl: z
    .url()
    .describe(
      'Open this link in a separate browser session signed in as the same Slides user. Only the browser form can confirm or cancel deletion.',
    ),
  expiresAt: z.iso.datetime(),
});
