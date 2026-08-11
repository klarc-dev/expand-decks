import type { TaskConfig } from 'payload';

import { runBuildSlidesTask } from './buildSlidesRunner';

export const BUILD_SLIDES_TASK = 'buildSlides' as const;

export const buildSlidesTask: TaskConfig = {
  slug: BUILD_SLIDES_TASK,
  label: 'Build Slidev Presentation',
  concurrency: ({ input }) => `buildSlides:${(input as { presentationId: string }).presentationId}`,
  inputSchema: [
    {
      name: 'presentationId',
      type: 'text',
      required: true,
    },
    {
      name: 'buildToken',
      type: 'text',
    },
    {
      // 'both' | 'pdf' | 'spa' — see src/lib/outputPolicy.ts
      name: 'outputPolicy',
      type: 'text',
    },
  ],
  outputSchema: [
    {
      name: 'success',
      type: 'checkbox',
    },
  ],
  retries: {
    attempts: 1,
    backoff: { type: 'fixed', delay: 10_000 },
  },
  // Direct import: the runner only shells out to the Slidev binary via
  // execFile (it never imports Slidev/Vue), so there's nothing heavy to keep
  // out of the bundle. A plain static import resolves correctly both in the
  // dedicated `jobs:run` worker and in the in-process autoRun cron — unlike the
  // previous `new Function('return import(...)')` trick, which Turbopack dev
  // resolved against the wrong chunk dir ("Cannot find module buildSlidesRunner").
  handler: runBuildSlidesTask,
};
