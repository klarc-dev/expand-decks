import type { SourceOption } from './sources/types';

export type BrowserSourceOption = SourceOption;

export type SourceOptionGroup = {
  kind: BrowserSourceOption['kind'];
  label: string;
  sources: BrowserSourceOption[];
};

export function groupSourceOptions(sources: BrowserSourceOption[]): SourceOptionGroup[] {
  const knowledge = sources.filter((source) => source.kind === 'knowledge');
  const external = sources.filter((source) => source.kind === 'external');
  return [
    ...(knowledge.length > 0
      ? [{ kind: 'knowledge' as const, label: 'Bases de connaissances', sources: knowledge }]
      : []),
    ...(external.length > 0
      ? [{ kind: 'external' as const, label: 'Sources externes', sources: external }]
      : []),
  ];
}

export function getSourceReadinessLabel(source: BrowserSourceOption): string | null {
  if (source.kind !== 'knowledge') return null;
  switch (source.readiness) {
    case 'empty':
      return 'Base vide — aucun document';
    case 'failed':
      return 'Indisponible — tous les documents ont échoué';
    case 'unavailable':
      return 'Indisponible — aucun document indexé';
    default:
      return null;
  }
}

export function isSourceUnready(source: BrowserSourceOption): boolean {
  return getSourceReadinessLabel(source) !== null;
}
