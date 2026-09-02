import { z } from 'zod';

import {
  MAX_SELECTED_SOURCES,
  SourceIdSchema,
  SourcePolicyError,
  type SourcePolicy,
} from './types';

export const SourcePolicySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none'), sourceIds: z.array(SourceIdSchema).max(0).default([]) }),
  z.object({ mode: z.literal('exclusive'), sourceIds: z.array(SourceIdSchema) }),
  z.object({
    mode: z.literal('multiple'),
    sourceIds: z.array(SourceIdSchema).max(MAX_SELECTED_SOURCES),
  }),
]);

export function normalizeSourcePolicy(input: unknown): SourcePolicy {
  const parsed = SourcePolicySchema.safeParse(input);
  if (!parsed.success) throw new SourcePolicyError('Invalid source policy');

  const sourceIds = [...new Set(parsed.data.sourceIds.map((id) => SourceIdSchema.parse(id)))];
  if (parsed.data.mode === 'none') return { mode: 'none', sourceIds: [] };
  if (parsed.data.mode === 'exclusive' && sourceIds.length !== 1) {
    throw new SourcePolicyError('Exclusive source policy requires exactly one source');
  }
  if (parsed.data.mode === 'multiple' && sourceIds.length > MAX_SELECTED_SOURCES) {
    throw new SourcePolicyError(
      `Multiple source policy allows at most ${MAX_SELECTED_SOURCES} sources`,
    );
  }
  return { mode: parsed.data.mode, sourceIds };
}

export function legacySourcePolicy(sourceIds: readonly string[] | undefined): SourcePolicy {
  const ids = sourceIds ?? [];
  return normalizeSourcePolicy({ mode: ids.length === 0 ? 'none' : 'multiple', sourceIds: ids });
}
