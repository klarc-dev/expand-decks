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

/** Agentic builder run state, surfaced in the admin + mirrored to draftEvents. */
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
