import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';

export const KNOWLEDGE_MIN_SCORE = 0.35;
export const KNOWLEDGE_DEFAULT_TOP_K = 5;
export const KNOWLEDGE_MAX_TOP_K = 10;
export const KNOWLEDGE_CANDIDATE_MULTIPLIER = 3;
/** Maximum passages any single document may contribute to the final evidence set. */
export const KNOWLEDGE_MAX_PER_DOCUMENT = 2;
/** Jaccard token overlap above which two passages count as near-duplicates. */
export const KNOWLEDGE_DUPLICATE_OVERLAP = 0.9;
/** Weight of vector similarity in the fused ranking score. */
export const KNOWLEDGE_SEMANTIC_WEIGHT = 0.6;
/** Weight of exact-term (lexical) coverage in the fused ranking score. */
export const KNOWLEDGE_LEXICAL_WEIGHT = 0.35;
/** Weight of the original vector-store rank, breaking ties deterministically. */
export const KNOWLEDGE_POSITION_WEIGHT = 0.05;

export type KnowledgeRetrievalSource = {
  knowledgeBaseId: number | string;
  indexName: string;
};

export type KnowledgeRetrievalDependencies = {
  vectorStore: KnowledgeVectorStore;
  embedQuery: (query: string) => Promise<number[]>;
};

export type KnowledgeEvidenceItem = {
  text: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  chunkId: string;
  headingPath?: string;
  score: number;
};

/** Lexical tokens used for exact-term matching (names, codes, dates, amounts). */
function tokens(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Deterministic lexical score: share of query terms present in the passage,
 * weighted so rarer, more specific terms (digits, long words) count for more.
 */
function lexicalScore(queryTerms: readonly string[], text: string): number {
  if (queryTerms.length === 0) return 0;
  const textTerms = new Set(tokens(text));
  let matched = 0;
  let total = 0;
  for (const term of queryTerms) {
    const weight = /\d/.test(term) || term.length >= 8 ? 2 : 1;
    total += weight;
    if (textTerms.has(term)) matched += weight;
  }
  return total === 0 ? 0 : matched / total;
}

function evidenceItem(hit: KnowledgeQueryResult): KnowledgeEvidenceItem | undefined {
  const metadata = hit.metadata ?? {};
  if (
    typeof metadata.text !== 'string' ||
    typeof metadata.documentId !== 'string' ||
    typeof metadata.title !== 'string' ||
    typeof metadata.chunkIndex !== 'number'
  )
    return undefined;
  return {
    text: metadata.text,
    documentId: metadata.documentId,
    documentTitle: metadata.title,
    chunkIndex: metadata.chunkIndex,
    chunkId: typeof metadata.chunkId === 'string' ? metadata.chunkId : hit.id,
    ...(typeof metadata.headingPath === 'string' && metadata.headingPath
      ? { headingPath: metadata.headingPath }
      : {}),
    score: hit.score,
  };
}

/**
 * Server-owned retrieval contract: the caller supplies the authorized knowledge
 * base; index name and metadata filter are never taken from model input.
 */
export async function retrieveKnowledgeEvidence(args: {
  source: KnowledgeRetrievalSource;
  query: string;
  topK?: number;
  deps: KnowledgeRetrievalDependencies;
}): Promise<KnowledgeEvidenceItem[]> {
  const topK = Math.min(args.topK ?? KNOWLEDGE_DEFAULT_TOP_K, KNOWLEDGE_MAX_TOP_K);
  const queryVector = await args.deps.embedQuery(args.query);
  const hits = await args.deps.vectorStore.query({
    indexName: args.source.indexName,
    queryVector,
    topK: Math.min(
      KNOWLEDGE_MAX_TOP_K * KNOWLEDGE_CANDIDATE_MULTIPLIER,
      topK * KNOWLEDGE_CANDIDATE_MULTIPLIER,
    ),
    minScore: KNOWLEDGE_MIN_SCORE,
    filter: { knowledgeBaseId: String(args.source.knowledgeBaseId) },
  });

  const queryTerms = tokens(args.query);
  const ranked = hits
    .map((hit, position) => {
      const item = evidenceItem(hit);
      if (!item) return undefined;
      const lexical = lexicalScore(queryTerms, item.text);
      return {
        item,
        rank:
          hit.score * KNOWLEDGE_SEMANTIC_WEIGHT +
          lexical * KNOWLEDGE_LEXICAL_WEIGHT +
          (1 / (position + 1)) * KNOWLEDGE_POSITION_WEIGHT,
      };
    })
    .filter((entry): entry is { item: KnowledgeEvidenceItem; rank: number } => Boolean(entry))
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        b.item.score - a.item.score ||
        a.item.chunkId.localeCompare(b.item.chunkId),
    )
    .map((entry) => entry.item);

  return selectDiverseEvidence(ranked, topK);
}

/** Jaccard overlap between two pre-computed token sets. */
function overlapRatio(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const term of left) if (right.has(term)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Relevance-ordered selection that drops near-duplicates outright and prevents a
 * single document from monopolising the bounded evidence budget. Passages held
 * back only by the per-document cap may backfill unused budget; near-duplicates
 * never can, since they add no information.
 */
export function selectDiverseEvidence(
  ranked: readonly KnowledgeEvidenceItem[],
  topK: number,
): KnowledgeEvidenceItem[] {
  // Tokenize once per candidate; duplicate detection then compares prepared sets.
  const candidates = ranked.map((item) => ({ item, terms: new Set(tokens(item.text)) }));
  const selected: typeof candidates = [];
  const overflow: typeof candidates = [];
  const perDocument = new Map<string, number>();

  const isDuplicate = (candidate: (typeof candidates)[number]) =>
    selected.some(
      (chosen) => overlapRatio(chosen.terms, candidate.terms) >= KNOWLEDGE_DUPLICATE_OVERLAP,
    );

  for (const candidate of candidates) {
    if (selected.length >= topK) break;
    if (isDuplicate(candidate)) continue;
    const used = perDocument.get(candidate.item.documentId) ?? 0;
    if (used >= KNOWLEDGE_MAX_PER_DOCUMENT) {
      overflow.push(candidate);
      continue;
    }
    selected.push(candidate);
    perDocument.set(candidate.item.documentId, used + 1);
  }

  for (const candidate of overflow) {
    if (selected.length >= topK) break;
    if (isDuplicate(candidate)) continue;
    selected.push(candidate);
  }
  return selected.map((candidate) => candidate.item);
}
