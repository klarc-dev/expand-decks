import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';

/**
 * Similarity floor below which a passage is not returned at all. This is the
 * pipeline's only abstention mechanism: on a question the corpus cannot answer,
 * it is what stops the nearest topical passage being handed over as evidence.
 *
 * Calibrated against the actual production embedding model (`@mastra/fastembed`)
 * on the versioned retrieval dataset by
 * `scripts/evals/retrieval-embedding-threshold.mts`. At 0.72:
 * - no-answer precision reaches 1.00 (both unsupported questions abstain),
 * - answerable-case recall is 0.8125 (0.65 when averaged with no-answer cases),
 * - nDCG remains 0.90.
 *
 * 0.68 preserves the best observed answerable recall (0.875) but answers one
 * of two unsupported questions; 0.74 gains no abstention and cuts answerable recall to 0.646. Thus
 * 0.72 is the first floor with complete abstention and the best recall at that
 * precision. Re-run the script whenever the embedding model or dataset changes.
 */
export const KNOWLEDGE_MIN_SCORE = 0.72;
export const KNOWLEDGE_DEFAULT_TOP_K = 5;
export const KNOWLEDGE_MAX_TOP_K = 10;
export const KNOWLEDGE_CANDIDATE_MULTIPLIER = 3;
/**
 * Maximum passages any single document may contribute to the final evidence set.
 *
 * Measured on the retrieval dataset (scripts/evals/retrieval-sweep.mts): a cap of
 * 2 costs recall on multi-passage questions, where three parts of one document
 * are all required. 3 reaches full recall with the best context precision;
 * raising it to 5 changes nothing, so 3 is the smallest value that wins.
 */
export const KNOWLEDGE_MAX_PER_DOCUMENT = 3;
/** Jaccard token overlap above which two passages count as near-duplicates. */
export const KNOWLEDGE_DUPLICATE_OVERLAP = 0.9;
/**
 * Ranking weights.
 *
 * Measured across query classes (scripts/evals/retrieval-classes.mts). When the
 * vector signal already separates chunks sharply, lexical weight is neutral or
 * mildly harmful. When it does not — a topic-only embedding, which is the
 * realistic case for rare codes, references and amounts — a lexical weight of
 * 0.35 is the peak: it lifts exact-term MRR from 0.83 to 1.00 and semantic MRR
 * from 0.44 to 0.67, while 0.55 starts to over-weight surface tokens and loses
 * ground again. The position term only breaks ties and stays small.
 */
export const KNOWLEDGE_SEMANTIC_WEIGHT = 0.6;
export const KNOWLEDGE_LEXICAL_WEIGHT = 0.35;
export const KNOWLEDGE_POSITION_WEIGHT = 0.05;

/** Tunable ranking configuration, selected by measurement (see retrievalEval). */
export type KnowledgeRankingConfig = {
  semanticWeight: number;
  lexicalWeight: number;
  positionWeight: number;
  maxPerDocument: number;
};

export const KNOWLEDGE_RANKING: KnowledgeRankingConfig = {
  semanticWeight: KNOWLEDGE_SEMANTIC_WEIGHT,
  lexicalWeight: KNOWLEDGE_LEXICAL_WEIGHT,
  positionWeight: KNOWLEDGE_POSITION_WEIGHT,
  maxPerDocument: KNOWLEDGE_MAX_PER_DOCUMENT,
};

export type KnowledgeRetrievalSource = {
  knowledgeBaseId: number | string;
  indexName: string;
};

export type KnowledgeRetrievalDependencies = {
  vectorStore: KnowledgeVectorStore;
  embedQuery: (query: string) => Promise<number[]>;
};

export type KnowledgeRankingComponents = {
  /** Vector similarity as returned by the store. */
  semantic: number;
  /** Weighted share of query terms found verbatim in the passage. */
  lexical: number;
  /** 1-based position among the store's candidates before reranking. */
  position: number;
  /** Fused score the passages were ordered by. */
  score: number;
};

export type KnowledgeEvidenceItem = {
  text: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  chunkId: string;
  headingPath?: string;
  score: number;
  ranking: KnowledgeRankingComponents;
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

function evidenceItem(
  hit: KnowledgeQueryResult,
): Omit<KnowledgeEvidenceItem, 'ranking'> | undefined {
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
  ranking?: KnowledgeRankingConfig;
  minScore?: number;
}): Promise<KnowledgeEvidenceItem[]> {
  const ranking = args.ranking ?? KNOWLEDGE_RANKING;
  const topK = Math.min(args.topK ?? KNOWLEDGE_DEFAULT_TOP_K, KNOWLEDGE_MAX_TOP_K);
  const queryVector = await args.deps.embedQuery(args.query);
  const hits = await args.deps.vectorStore.query({
    indexName: args.source.indexName,
    queryVector,
    topK: Math.min(
      KNOWLEDGE_MAX_TOP_K * KNOWLEDGE_CANDIDATE_MULTIPLIER,
      topK * KNOWLEDGE_CANDIDATE_MULTIPLIER,
    ),
    minScore: args.minScore ?? KNOWLEDGE_MIN_SCORE,
    filter: { knowledgeBaseId: String(args.source.knowledgeBaseId) },
  });

  const queryTerms = tokens(args.query);
  const ranked = hits
    .map((hit, position) => {
      const item = evidenceItem(hit);
      if (!item) return undefined;
      const lexical = lexicalScore(queryTerms, item.text);
      const score =
        hit.score * ranking.semanticWeight +
        lexical * ranking.lexicalWeight +
        (1 / (position + 1)) * ranking.positionWeight;
      return {
        ...item,
        ranking: { semantic: hit.score, lexical, position: position + 1, score },
      } satisfies KnowledgeEvidenceItem;
    })
    .filter((entry): entry is KnowledgeEvidenceItem => Boolean(entry))
    .sort(
      (a, b) =>
        b.ranking.score - a.ranking.score ||
        b.score - a.score ||
        a.chunkId.localeCompare(b.chunkId),
    );

  return selectDiverseEvidence(ranked, topK, ranking.maxPerDocument);
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
  maxPerDocument: number = KNOWLEDGE_MAX_PER_DOCUMENT,
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
    if (used >= maxPerDocument) {
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
