import type { SourcePolicyMode } from './sources/types';

export function sourceIdsForPolicy(mode: SourcePolicyMode, selected: readonly string[]): string[] {
  if (mode === 'none') return [];
  if (mode === 'exclusive') return selected.slice(0, 1);
  return [...selected];
}

export function canStartWithSourcePolicy(
  mode: SourcePolicyMode,
  selected: readonly string[],
): boolean {
  return mode !== 'exclusive' || selected.length === 1;
}
