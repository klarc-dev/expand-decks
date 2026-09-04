import type { SourcePolicy } from './sources/types';

export function sourcePolicyForSelection(selected: readonly string[]): SourcePolicy {
  if (selected.length === 0) return { mode: 'none', sourceIds: [] };
  if (selected.length === 1) return { mode: 'exclusive', sourceIds: [...selected] };
  return { mode: 'multiple', sourceIds: [...selected] };
}
