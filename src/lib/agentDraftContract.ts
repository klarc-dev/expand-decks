import { z } from 'zod';
import { agentModelSchema } from './agentModelContract';
import { MIN_BRIEF_CHARS, slideCountRangeSchema } from './draftConfig';

export const AGENT_TIME_TRAVEL_STEPS = ['validate', 'visual'] as const;

export const agentDraftStartSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(MIN_BRIEF_CHARS).max(20_000),
  mode: z.enum(['replace', 'augment', 'revise']).default('replace'),
  model: agentModelSchema.optional(),
  visual: z.boolean().default(true),
  slideCountRange: slideCountRangeSchema.optional(),
  sourceIds: z.array(z.string()).optional(),
  sourcePolicy: z
    .object({
      mode: z.enum(['none', 'exclusive', 'multiple']),
      sourceIds: z.array(z.string()),
    })
    .optional(),
  approvalRequired: z.boolean().default(false),
});

const approved = z.boolean();
const step = z.enum(AGENT_TIME_TRAVEL_STEPS);

// Validate optional command fields even when the selected action does not use them.
const agentDraftCommandFields = z.object({ approved: approved.optional(), step: step.optional() });

export const agentDraftCommandSchema = z.discriminatedUnion('action', [
  agentDraftCommandFields.extend({ action: z.literal('cancel') }),
  agentDraftCommandFields.extend({ action: z.literal('restart') }),
  agentDraftCommandFields.extend({ action: z.literal('resume'), approved }),
  agentDraftCommandFields.extend({ action: z.literal('time-travel'), step }),
]);
