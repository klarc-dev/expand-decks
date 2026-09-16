import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';
import { KNOWLEDGE_RETRIEVAL_VERSION } from './knowledgeVersion';

export const KNOWLEDGE_MIN_SCORE = 0.86;
export const KNOWLEDGE_DEFAULT_TOP_K = 5;
export const KNOWLEDGE_MAX_TOP_K = 10;
const KNOWLEDGE_CANDIDATE_MULTIPLIER = 3;
/**
 * Maximum passages any single document may contribute to the final evidence set.
 *
 * Measured on the retrieval dataset: a cap of 2 costs recall on multi-passage
 * questions, while 3 reaches full recall with the best context precision.
 */
const KNOWLEDGE_MAX_PER_DOCUMENT = 3;
/** Jaccard token overlap above which two passages count as near-duplicates. */
const KNOWLEDGE_DUPLICATE_OVERLAP = 0.9;
/** Evaluated hybrid ranking weights; see docs/knowledge/retrieval-strategy.md. */
const KNOWLEDGE_SEMANTIC_WEIGHT = 0.6;
const KNOWLEDGE_LEXICAL_WEIGHT = 0.35;
const KNOWLEDGE_POSITION_WEIGHT = 0.05;
const KNOWLEDGE_MAX_QUERY_FORMULATIONS = 3;
const KNOWLEDGE_MAX_QUERY_LENGTH = 2_000;
const KNOWLEDGE_MAX_NEIGHBORS = 2;
const KNOWLEDGE_MIN_LEXICAL_SCORE = 0.35;

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

export type KnowledgeLexicalStore = {
  search(args: {
    indexName: string;
    knowledgeBaseId: string;
    retrievalVersion: number;
    query: string;
    topK: number;
  }): Promise<KnowledgeQueryResult[]>;
  byIds(args: {
    indexName: string;
    knowledgeBaseId: string;
    retrievalVersion: number;
    ids: string[];
  }): Promise<KnowledgeQueryResult[]>;
};

export type KnowledgeRetrievalDependencies = {
  vectorStore: KnowledgeVectorStore;
  lexicalStore?: KnowledgeLexicalStore;
  expandQuery?: (query: string) => Promise<string[]>;
  embedQuery: (query: string) => Promise<number[]>;
  now?: () => number;
};

export type KnowledgeRankingComponents = {
  semantic: number;
  lexical: number;
  position: number;
  score: number;
  candidateSources: ('semantic' | 'lexical' | 'neighbor')[];
};

export type KnowledgeEvidenceItem = {
  text: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  chunkId: string;
  contentHash?: string;
  sourceVersion?: string;
  headingPath?: string;
  parentSectionId?: string;
  previousChunkId?: string;
  nextChunkId?: string;
  score: number;
  ranking: KnowledgeRankingComponents;
};

function tokens(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

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
    ...(typeof metadata.contentHash === 'string' ? { contentHash: metadata.contentHash } : {}),
    ...(typeof metadata.sourceVersion === 'string'
      ? { sourceVersion: metadata.sourceVersion }
      : {}),
    ...(typeof metadata.headingPath === 'string' && metadata.headingPath
      ? { headingPath: metadata.headingPath }
      : {}),
    ...(typeof metadata.parentSectionId === 'string'
      ? { parentSectionId: metadata.parentSectionId }
      : {}),
    ...(typeof metadata.previousChunkId === 'string'
      ? { previousChunkId: metadata.previousChunkId }
      : {}),
    ...(typeof metadata.nextChunkId === 'string' ? { nextChunkId: metadata.nextChunkId } : {}),
    score: hit.score,
  };
}

function mergeCandidates(
  semanticHits: readonly KnowledgeQueryResult[],
  lexicalHits: readonly KnowledgeQueryResult[],
  query: string,
  ranking: KnowledgeRankingConfig,
): KnowledgeEvidenceItem[] {
  const queryTerms = tokens(query);
  const merged = new Map<
    string,
    {
      hit: KnowledgeQueryResult;
      semantic: number;
      lexical: number;
      position: number;
      sources: Set<'semantic' | 'lexical'>;
    }
  >();
  semanticHits.forEach((hit, index) => {
    merged.set(hit.id, {
      hit,
      semantic: hit.score,
      lexical: 0,
      position: index + 1,
      sources: new Set(['semantic']),
    });
  });
  lexicalHits.forEach((hit, index) => {
    const current = merged.get(hit.id);
    if (current) {
      current.lexical = Math.max(current.lexical, hit.score);
      current.sources.add('lexical');
    } else if (hit.score >= KNOWLEDGE_MIN_LEXICAL_SCORE) {
      merged.set(hit.id, {
        hit,
        semantic: 0,
        lexical: hit.score,
        position: semanticHits.length + index + 1,
        sources: new Set(['lexical']),
      });
    }
  });

  const items: KnowledgeEvidenceItem[] = [];
  for (const candidate of merged.values()) {
    const item = evidenceItem(candidate.hit);
    if (!item) continue;
    const lexical = Math.max(candidate.lexical, lexicalScore(queryTerms, item.text));
    const score =
      candidate.semantic * ranking.semanticWeight +
      lexical * ranking.lexicalWeight +
      (1 / candidate.position) * ranking.positionWeight;
    items.push({
      ...item,
      ranking: {
        semantic: candidate.semantic,
        lexical,
        position: candidate.position,
        score,
        candidateSources: [...candidate.sources].sort(),
      },
    });
  }
  return items.sort(
    (a, b) =>
      b.ranking.score - a.ranking.score || b.score - a.score || a.chunkId.localeCompare(b.chunkId),
  );
}

async function expandNeighbors(args: {
  selected: KnowledgeEvidenceItem[];
  source: KnowledgeRetrievalSource;
  topK: number;
  lexicalStore?: KnowledgeLexicalStore;
}): Promise<KnowledgeEvidenceItem[]> {
  if (!args.lexicalStore || args.topK <= 0) return args.selected;
  const ids: string[] = [];
  for (const item of args.selected) {
    if (item.previousChunkId) ids.push(item.previousChunkId);
    if (item.nextChunkId) ids.push(item.nextChunkId);
  }
  const wanted = [...new Set(ids)].slice(0, KNOWLEDGE_MAX_NEIGHBORS);
  if (!wanted.length) return args.selected;
  const hits = await args.lexicalStore.byIds({
    indexName: args.source.indexName,
    knowledgeBaseId: String(args.source.knowledgeBaseId),
    retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
    ids: wanted,
  });
  const selectedIds = new Set(args.selected.map((item) => item.chunkId));
  const parents = new Set(args.selected.map((item) => item.parentSectionId).filter(Boolean));
  const neighbors = hits
    .map((hit) => evidenceItem(hit))
    .filter((item): item is Omit<KnowledgeEvidenceItem, 'ranking'> => Boolean(item))
    .filter(
      (item) =>
        !selectedIds.has(item.chunkId) &&
        Boolean(item.parentSectionId) &&
        parents.has(item.parentSectionId),
    )
    .map(
      (item) =>
        ({
          ...item,
          ranking: {
            semantic: 0,
            lexical: 0,
            position: Number.MAX_SAFE_INTEGER,
            score: 0,
            candidateSources: ['neighbor'],
          },
        }) satisfies KnowledgeEvidenceItem,
    );
  if (!neighbors.length || args.selected.length >= args.topK) return args.selected;
  const contextBudget = args.topK - args.selected.length;
  return [...args.selected, ...neighbors.slice(0, contextBudget)];
}

function defaultQueryExpansion(query: string): string[] {
  const exactProbe = tokens(query)
    .filter((term) => /\d/.test(term) || term.length >= 8)
    .join(' ');
  return exactProbe && exactProbe !== query.toLocaleLowerCase() ? [exactProbe] : [];
}

function queryFormulations(query: string, expanded: readonly string[]): string[] {
  const normalized = [query, ...expanded]
    .map((item) => item.trim().slice(0, KNOWLEDGE_MAX_QUERY_LENGTH))
    .filter(Boolean);
  return [...new Set(normalized)].slice(0, KNOWLEDGE_MAX_QUERY_FORMULATIONS);
}

/** Server-owned, bounded hybrid retrieval contract. */
export async function retrieveKnowledgeEvidence(args: {
  source: KnowledgeRetrievalSource;
  query: string;
  topK?: number;
  deps: KnowledgeRetrievalDependencies;
  ranking?: KnowledgeRankingConfig;
  minScore?: number;
}): Promise<KnowledgeEvidenceItem[]> {
  const ranking = args.ranking ?? KNOWLEDGE_RANKING;
  const topK = Math.min(Math.max(args.topK ?? KNOWLEDGE_DEFAULT_TOP_K, 1), KNOWLEDGE_MAX_TOP_K);
  const candidateK = Math.min(
    KNOWLEDGE_MAX_TOP_K * KNOWLEDGE_CANDIDATE_MULTIPLIER,
    topK * KNOWLEDGE_CANDIDATE_MULTIPLIER,
  );
  const expanded = args.deps.expandQuery
    ? await args.deps.expandQuery(args.query)
    : defaultQueryExpansion(args.query);
  const formulations = queryFormulations(args.query, expanded);
  const sourceFilter = {
    knowledgeBaseId: String(args.source.knowledgeBaseId),
    retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
  };
  const semanticGroups = await Promise.all(
    formulations.map(async (query) => {
      const queryVector = await args.deps.embedQuery(query);
      return args.deps.vectorStore.query({
        indexName: args.source.indexName,
        queryVector,
        topK: candidateK,
        minScore: args.minScore ?? KNOWLEDGE_MIN_SCORE,
        filter: sourceFilter,
      });
    }),
  );
  const lexicalGroups = await Promise.all(
    formulations.map(
      (query) =>
        args.deps.lexicalStore?.search({
          indexName: args.source.indexName,
          knowledgeBaseId: String(args.source.knowledgeBaseId),
          retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION,
          query,
          topK: candidateK,
        }) ?? Promise.resolve([]),
    ),
  );
  const bestHits = (groups: readonly KnowledgeQueryResult[][]) => {
    const byId = new Map<string, KnowledgeQueryResult>();
    for (const group of groups) {
      for (const hit of group) {
        const current = byId.get(hit.id);
        if (!current || hit.score > current.score) byId.set(hit.id, hit);
      }
    }
    return [...byId.values()]
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, candidateK);
  };
  const semanticHits = bestHits(semanticGroups);
  const lexicalHits = bestHits(lexicalGroups);
  const ranked = mergeCandidates(semanticHits, lexicalHits, formulations.join(' '), ranking);
  const selected = selectDiverseEvidence(ranked, topK, ranking.maxPerDocument);
  return expandNeighbors({
    selected,
    source: args.source,
    topK,
    lexicalStore: args.deps.lexicalStore,
  });
}

function overlapRatio(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const term of left) if (right.has(term)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Relevance-ordered selection that drops near-duplicates and prevents one
 * document from monopolising the bounded evidence budget.
 */
function selectDiverseEvidence(
  ranked: readonly KnowledgeEvidenceItem[],
  topK: number,
  maxPerDocument: number = KNOWLEDGE_MAX_PER_DOCUMENT,
): KnowledgeEvidenceItem[] {
  const candidates = ranked.map((item) => ({
    item,
    terms: new Set(tokens(item.text)),
  }));
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
    if (!isDuplicate(candidate)) selected.push(candidate);
  }
  return selected.map((candidate) => candidate.item);
}
