/**
 * Deterministic retrieval harness for evaluation.
 *
 * Vector similarity is simulated with a character-trigram cosine over the
 * dataset text. This is not a real embedding model, but it has the property the
 * evaluation needs: it rewards fuzzy/semantic overlap while being weak at exact
 * rare tokens (codes, amounts) — the same weakness the lexical signal exists to
 * cover. Because it is deterministic, measurements are reproducible in CI.
 */

import type { KnowledgeQueryResult } from '../../knowledgeVector';
import type { DatasetChunk } from '../fixtures/retrievalDataset';

function trigrams(value: string): Map<string, number> {
  const normalized = value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const counts = new Map<string, number>();
  for (let index = 0; index + 3 <= normalized.length; index += 1) {
    const gram = normalized.slice(index, index + 3);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

function cosine(left: Map<string, number>, right: Map<string, number>): number {
  let dot = 0;
  for (const [gram, weight] of left) dot += weight * (right.get(gram) ?? 0);
  const norm = (counts: Map<string, number>) =>
    Math.sqrt([...counts.values()].reduce((total, value) => total + value * value, 0));
  const magnitude = norm(left) * norm(right);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/** Simulated vector-store hits, ordered by simulated similarity. */
export function simulatedVectorHits(
  chunks: readonly DatasetChunk[],
  query: string,
  minScore: number,
): KnowledgeQueryResult[] {
  const queryGrams = trigrams(query);
  return chunks
    .map((chunk) => ({
      id: chunk.chunkId,
      score: cosine(queryGrams, trigrams(`${chunk.headingPath ?? ''} ${chunk.text}`)),
      metadata: {
        knowledgeBaseId: '1',
        documentId: chunk.documentId,
        title: chunk.documentTitle,
        chunkIndex: 0,
        chunkId: chunk.chunkId,
        text: chunk.text,
        ...(chunk.headingPath ? { headingPath: chunk.headingPath } : {}),
      },
    }))
    .filter((hit) => hit.score >= minScore)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
