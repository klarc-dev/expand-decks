import { createHash } from 'node:crypto';

export function agentRunFingerprint(input: {
  presentationId: string;
  brief: string;
  mode: string;
  visual: boolean;
  sourcePolicy?: string;
  sourceIds: readonly string[];
  approvalRequired: boolean;
}): string {
  const sourcePolicy = input.sourcePolicy ?? (input.sourceIds.length === 0 ? 'none' : 'multiple');
  return createHash('sha256')
    .update(
      JSON.stringify({
        ...input,
        sourcePolicy,
        sourceIds: [...input.sourceIds].sort(),
      }),
    )
    .digest('hex');
}

export const AGENT_RUN_TERMINAL = new Set(['succeeded', 'failed', 'canceled']);
export const AGENT_TIME_TRAVEL_STEPS = ['validate', 'visual'] as const;
// Heartbeats are written by the Payload job independently of model events.
export const AGENT_RUN_HEARTBEAT_INTERVAL_MS = 15_000;
export const AGENT_RUN_MAX_RUNTIME_MS = 20 * 60_000;
export const AGENT_RUN_STALE_MS = 2 * 60_000;

export function sanitizeRunError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/\b(api[_-]?key|authorization|token|password|secret)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .slice(0, 2_000);
}
