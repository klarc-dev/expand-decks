export const BUILD_STATUS = {
  idle: 'idle',
  building: 'building',
  success: 'success',
  failed: 'failed',
} as const;
export const PRESENTATION_STATUS = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const;
export type BuildStatus = (typeof BUILD_STATUS)[keyof typeof BUILD_STATUS];
export type PresentationStatus = (typeof PRESENTATION_STATUS)[keyof typeof PRESENTATION_STATUS];

/** Agentic builder run state, surfaced in the admin sidebar. */
export const DRAFT_STATUS = {
  idle: 'idle',
  gathering: 'gathering',
  structuring: 'structuring',
  drafting: 'drafting',
  validating: 'validating',
  building: 'building',
  done: 'done',
  failed: 'failed',
} as const;
export type DraftStatus = (typeof DRAFT_STATUS)[keyof typeof DRAFT_STATUS];

/** Statuses during which a run owns the presentation: options stay read-only. */
export const ACTIVE_DRAFT_STATUSES: ReadonlySet<string> = new Set<string>([
  DRAFT_STATUS.gathering,
  DRAFT_STATUS.structuring,
  DRAFT_STATUS.drafting,
  DRAFT_STATUS.validating,
  DRAFT_STATUS.building,
]);

/**
 * Indexing state of a knowledge document. Documents land on `pending` at
 * upload; the ingestion job (separate ticket) drives the remaining states.
 */
export const INDEXING_STATUS = {
  pending: 'pending',
  indexing: 'indexing',
  indexed: 'indexed',
  failed: 'failed',
} as const;
