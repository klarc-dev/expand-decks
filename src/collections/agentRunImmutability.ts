import type { CollectionBeforeChangeHook } from 'payload';

export const AGENT_RUN_IMMUTABLE_FIELDS = [
  'presentation',
  'createdBy',
  'organisation',
  'mastraRunId',
  'requestId',
  'traceId',
  'mode',
  'brief',
  'language',
  'visual',
  'approvalRequired',
  'sourcePolicy',
  'sourceIds',
  'revisionContext',
  'inputFingerprint',
] as const;

/**
 * Payload admin readOnly is presentation-only. This hook is the server-side
 * boundary: every public REST, GraphQL, and local API update keeps the original
 * run inputs while still allowing status/command/heartbeat lifecycle updates.
 */
export const preserveAgentRunInputs: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== 'update' || !originalDoc) return data;
  const next = { ...data };
  for (const field of AGENT_RUN_IMMUTABLE_FIELDS) {
    if (field in originalDoc) next[field] = originalDoc[field];
    else delete next[field];
  }
  return next;
};
