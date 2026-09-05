import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';

export const KNOWLEDGE_MIN_SCORE = 0.35;
export const KNOWLEDGE_DEFAULT_TOP_K = 5;
export const KNOWLEDGE_MAX_TOP_K = 10;
export const KNOWLEDGE_CANDIDATE_MULTIPLIER = 3;
/** Maximum passages any single document may contribute to the final evidence set. */
export const KNOWLEDGE_MAX_PER_DOCUMENT = 2;
/** Jaccard token overlap above which two passages count as near-duplicates. */
export const KNOWLEDGE_DUPLICATE_OVERLAP = 0.9;

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
        rank: hit.score * 0.6 + lexical * 0.35 + (1 / (position + 1)) * 0.05,
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

/** Jaccard overlap between two passages' token sets. */
function overlapRatio(left: string, right: string): number {
  const leftTerms = new Set(tokens(left));
  const rightTerms = new Set(tokens(right));
  if (leftTerms.size === 0 || rightTerms.size === 0) return 0;
  let shared = 0;
  for (const term of leftTerms) if (rightTerms.has(term)) shared += 1;
  return shared / (leftTerms.size + rightTerms.size - shared);
}

/**
 * Relevance-ordered selection that suppresses near-duplicates and prevents a
 * single document from monopolising the bounded evidence budget. Skipped
 * candidates are reconsidered only if the budget would otherwise go unused.
 */
export function selectDiverseEvidence(
  ranked: readonly KnowledgeEvidenceItem[],
  topK: number,
): KnowledgeEvidenceItem[] {
  const selected: KnowledgeEvidenceItem[] = [];
  const deferred: KnowledgeEvidenceItem[] = [];
  const perDocument = new Map<string, number>();

  for (const item of ranked) {
    if (selected.length >= topK) break;
    const used = perDocument.get(item.documentId) ?? 0;
    const duplicate = selected.some(
      (chosen) => overlapRatio(chosen.text, item.text) >= KNOWLEDGE_DUPLICATE_OVERLAP,
    );
    if (duplicate || used >= KNOWLEDGE_MAX_PER_DOCUMENT) {
      deferred.push(item);
      continue;
    }
    selected.push(item);
    perDocument.set(item.documentId, used + 1);
  }

  for (const item of deferred) {
    if (selected.length >= topK) break;
    selected.push(item);
  }
  return selected;
}
