import type { TaskConfig } from 'payload';

import { runBuildSlidesTask } from './buildSlidesRunner';

export const BUILD_SLIDES_TASK = 'buildSlides' as const;

type BuildSlidesConcurrencyInput = {
  presentationId: string;
  mediaProductionRequestId?: string;
  mediaRequestId?: string;
  publicationId?: string;
  revisionSha256?: string;
};

function buildConcurrencyKey(input: BuildSlidesConcurrencyInput): string {
  const producerBinding =
    input.mediaProductionRequestId ??
    input.mediaRequestId ??
    input.publicationId ??
    input.revisionSha256;
  return producerBinding
    ? `buildSlides:${input.presentationId}:producer:${producerBinding}`
    : `buildSlides:${input.presentationId}:generic`;
}

export const buildSlidesTask: TaskConfig = {
  slug: BUILD_SLIDES_TASK,
  label: 'Build Slidev Presentation',
  concurrency: {
    key: ({ input }: { input: unknown }) =>
      buildConcurrencyKey(input as BuildSlidesConcurrencyInput),
    supersedes: true,
  },
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
