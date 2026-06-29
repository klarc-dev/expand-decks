import { z } from 'zod';

export const SOURCE_ID_MAX = 80;
export const SOURCE_LABEL_MAX = 160;
export const MAX_SELECTED_SOURCES = 8;
export const DEFAULT_SOURCE_TIMEOUT_MS = 30_000;

export const SourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(SOURCE_ID_MAX)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
    'Source ids may contain letters, numbers, dot, underscore and dash',
  );

const baseSource = z.object({
  id: SourceIdSchema,
  label: z.string().trim().min(1).max(SOURCE_LABEL_MAX),
  timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
});

export const StdioSourceDescriptorSchema = baseSource.extend({
  transport: z.literal('stdio'),
  command: z.string().trim().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional(),
});

export const HttpSourceDescriptorSchema = baseSource.extend({
  transport: z.literal('http'),
  url: z
    .string()
    .url()
    .refine(
      (value) => {
        try {
          return ['http:', 'https:'].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      },
      { message: 'HTTP source URLs must use http or https' },
    ),
});

export const SourceDescriptorSchema = z.discriminatedUnion('transport', [
  StdioSourceDescriptorSchema,
  HttpSourceDescriptorSchema,
]);

export const SourceRegistrySchema = z.array(SourceDescriptorSchema);

export type SourceId = z.infer<typeof SourceIdSchema>;
export type StdioSourceDescriptor = z.infer<typeof StdioSourceDescriptorSchema>;
export type HttpSourceDescriptor = z.infer<typeof HttpSourceDescriptorSchema>;
export type SourceDescriptor = z.infer<typeof SourceDescriptorSchema>;

export type SourceOption = Pick<SourceDescriptor, 'id' | 'label'>;
export type ResolvedSource = SourceDescriptor;

export type Evidence = {
  sourceId: SourceId;
  sourceLabel: string;
  summary: string;
  url?: string;
};

export class SourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceConfigError';
  }
}

export class UnknownSourceError extends Error {
  readonly unknownIds: string[];

  constructor(unknownIds: string[]) {
    super(`Unknown source id(s): ${unknownIds.join(', ')}`);
    this.name = 'UnknownSourceError';
    this.unknownIds = unknownIds;
  }
}

export class TooManySourcesError extends Error {
  readonly max: number;
  readonly count: number;

  constructor(max: number, count: number) {
    super(`Too many source ids selected (${count}); maximum is ${max}`);
    this.name = 'TooManySourcesError';
    this.max = max;
    this.count = count;
  }
}
