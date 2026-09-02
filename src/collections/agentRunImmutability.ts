import { ValidationError, type CollectionBeforeChangeHook } from 'payload';

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

function relationshipId(value: unknown): unknown {
  if (value && typeof value === 'object' && 'id' in value) {
    return (value as { id: unknown }).id;
  }
  return value;
}

function semanticValue(
  field: (typeof AGENT_RUN_IMMUTABLE_FIELDS)[number],
  value: unknown,
): unknown {
  if (field === 'presentation' || field === 'createdBy' || field === 'organisation') {
    return relationshipId(value);
  }
  return value;
}

function semanticallyEqual(
  field: (typeof AGENT_RUN_IMMUTABLE_FIELDS)[number],
  supplied: unknown,
  original: unknown,
): boolean {
  return (
    JSON.stringify(semanticValue(field, supplied)) ===
    JSON.stringify(semanticValue(field, original))
  );
}

/** Reject attempts to rewrite the immutable inputs of a durable agent run. */
export const preserveAgentRunInputs: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) return data;
  const changed = AGENT_RUN_IMMUTABLE_FIELDS.filter(
    (field) => field in data && !semanticallyEqual(field, data[field], originalDoc[field]),
  );
  if (changed.length > 0) {
    throw new ValidationError({
      errors: changed.map((field) => ({
        path: field,
        message: 'Agent run inputs are immutable after creation',
      })),
      req,
    });
  }
  return data;
};
