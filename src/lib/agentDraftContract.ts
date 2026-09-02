import { AGENT_TIME_TRAVEL_STEPS } from '@/jobs/agentRunLifecycle';

import { z } from 'zod';

export const agentDraftStartSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(20_000),
  mode: z.enum(['replace', 'augment', 'revise']).default('replace'),
  visual: z.boolean().default(true),
  sourceIds: z.array(z.string()).optional(),
  sourcePolicy: z
    .object({ mode: z.enum(['none', 'exclusive', 'multiple']), sourceIds: z.array(z.string()) })
    .optional(),
  approvalRequired: z.boolean().default(false),
});

export const agentDraftCommandSchema = z
  .object({
    action: z.enum(['cancel', 'restart', 'resume', 'time-travel']),
    approved: z.boolean().optional(),
    step: z.enum(AGENT_TIME_TRAVEL_STEPS).optional(),
  })
  .superRefine((command, context) => {
    if (command.action === 'resume' && command.approved === undefined)
      context.addIssue({ code: 'custom', path: ['approved'], message: 'Required' });
    if (command.action === 'time-travel' && command.step === undefined)
      context.addIssue({ code: 'custom', path: ['step'], message: 'Required' });
  });
