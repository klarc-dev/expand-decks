import { listSourceDescriptors } from './registry';
import {
  MAX_SELECTED_SOURCES,
  SourceIdSchema,
  TooManySourcesError,
  UnknownSourceError,
  type ResolvedSource,
} from './types';

export function normalizeSourceIds(ids: readonly string[] | undefined): string[] {
  if (!ids?.length) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const parsed = SourceIdSchema.safeParse(raw);
    if (!parsed.success) throw new UnknownSourceError([raw]);
    if (seen.has(parsed.data)) continue;
    seen.add(parsed.data);
    normalized.push(parsed.data);
  }
  if (normalized.length > MAX_SELECTED_SOURCES) {
    throw new TooManySourcesError(MAX_SELECTED_SOURCES, normalized.length);
  }
  return normalized;
}

export function resolveSources(ids: readonly string[] | undefined): ResolvedSource[] {
  const selected = normalizeSourceIds(ids);
  if (selected.length === 0) return [];

  const byId = new Map(listSourceDescriptors().map((source) => [source.id, source]));
  const unknown = selected.filter((id) => !byId.has(id));
  if (unknown.length > 0) throw new UnknownSourceError(unknown);

  return selected.map((id) => byId.get(id)!);
}
