import { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';

export const DECK_PHASES = ['gather', 'structure', 'draft', 'validate', 'visual', 'fonts'] as const;

export const DeckRequestContextSchema = z.object({
  requestId: z.string().min(1).max(128),
  presentationId: z.string().min(1).max(128),
  runId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128).optional(),
  organizationId: z.string().min(1).max(128).optional(),
  phase: z.enum(DECK_PHASES),
});

export type DeckRequestContextValues = z.infer<typeof DeckRequestContextSchema>;
export type DeckRequestContext = RequestContext<DeckRequestContextValues>;

export function createDeckRequestContext(values: DeckRequestContextValues): DeckRequestContext {
  const parsed = DeckRequestContextSchema.parse(values);
  const context = new RequestContext<DeckRequestContextValues>();
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) context.set(key as keyof DeckRequestContextValues, value);
  }
  return context;
}

export function childRequestContext(
  parent: DeckRequestContext,
  phase: DeckRequestContextValues['phase'],
): DeckRequestContext {
  return createDeckRequestContext({
    requestId: parent.get('requestId')!,
    presentationId: parent.get('presentationId')!,
    runId: parent.get('runId')!,
    userId: parent.get('userId'),
    organizationId: parent.get('organizationId'),
    phase,
  });
}
