import type { TaskConfig } from 'payload';

export const BUILD_SLIDES_TASK = 'buildSlides' as const;
const BUILD_SLIDES_RUNNER_MODULE = './buildSlidesRunner';
const runtimeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<typeof import('./buildSlidesRunner')>;

export const buildSlidesTask: TaskConfig = {
  slug: BUILD_SLIDES_TASK,
  label: 'Build Slidev Presentation',
  inputSchema: [
    {
      name: 'presentationId',
      type: 'text',
      required: true,
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
  handler: async (args) => {
    const { runBuildSlidesTask } = await runtimeImport(BUILD_SLIDES_RUNNER_MODULE);
    return runBuildSlidesTask(args);
  },
};
