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
