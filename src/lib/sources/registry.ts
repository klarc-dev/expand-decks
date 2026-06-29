import {
  DEFAULT_SOURCE_TIMEOUT_MS,
  SourceConfigError,
  SourceRegistrySchema,
  type SourceDescriptor,
  type SourceOption,
} from './types';

const REGISTRY_ENV = 'AGENT_SOURCE_REGISTRY_JSON';

let cachedRaw: string | undefined;
let cachedRegistry: SourceDescriptor[] | undefined;

function withDefaults(source: SourceDescriptor): SourceDescriptor {
  return {
    ...source,
    timeoutMs: source.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS,
  } as SourceDescriptor;
}

function parseRegistry(raw: string | undefined): SourceDescriptor[] {
  if (!raw?.trim()) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new SourceConfigError(
      `${REGISTRY_ENV} must be a JSON array of source descriptors: ${(error as Error).message}`,
    );
  }

  const parsed = SourceRegistrySchema.safeParse(json);
  if (!parsed.success) {
    throw new SourceConfigError(
      `${REGISTRY_ENV} is invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
        .join('; ')}`,
    );
  }

  const ids = new Set<string>();
  for (const source of parsed.data) {
    if (ids.has(source.id)) {
      throw new SourceConfigError(`${REGISTRY_ENV} contains duplicate source id: ${source.id}`);
    }
    ids.add(source.id);
  }

  return parsed.data.map(withDefaults);
}

export function listSourceDescriptors(): SourceDescriptor[] {
  const raw = process.env[REGISTRY_ENV];
  if (cachedRegistry && cachedRaw === raw) return cachedRegistry;
  cachedRaw = raw;
  cachedRegistry = parseRegistry(raw);
  return cachedRegistry;
}

export function listSourceOptions(): SourceOption[] {
  return listSourceDescriptors().map(({ id, label }) => ({ id, label }));
}

export function __resetSourceRegistryForTests(): void {
  cachedRaw = undefined;
  cachedRegistry = undefined;
}

export { REGISTRY_ENV as SOURCE_REGISTRY_ENV };
