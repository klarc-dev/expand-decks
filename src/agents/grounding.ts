import { EvidenceSchema, type Evidence } from '../lib/sources/types';

export function validateGrounding(
  dossier: { sources?: Array<string | { id?: string; label?: string }> },
  evidence: Evidence[],
): Evidence[] {
  const validated = evidence.map((item) => EvidenceSchema.parse(item));
  const captured = new Set(validated.map((item) => item.sourceId));
  const unsupported = (dossier.sources ?? [])
    .map((source) => (typeof source === 'string' ? source : source.id))
    .filter((id): id is string => !!id && !captured.has(id));
  if (unsupported.length) {
    throw new Error(
      `Dossier cites source(s) without captured tool evidence: ${unsupported.join(', ')}`,
    );
  }
  for (const item of validated) {
    if (!item.excerpt.trim() || item.claim !== item.excerpt) {
      throw new Error(`Evidence ${item.id} is not a captured sanitized excerpt`);
    }
  }
  return validated;
}
