import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';
import type { KnowledgeLexicalStore } from './knowledgeRetrieval';

function terms(value: string): string[] {
  return [...new Set(value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter((term) => term.length >= 2)
    .slice(0, 16);
}

function lexicalScore(queryTerms: readonly string[], text: string): number {
  if (!queryTerms.length) return 0;
  const haystack = new Set(terms(text));
  let matched = 0;
  let total = 0;
  for (const term of queryTerms) {
    const weight = /\d/.test(term) || term.length >= 8 ? 2 : 1;
    total += weight;
    if (haystack.has(term)) matched += weight;
  }
  return total ? matched / total : 0;
}

/**
 * Bounded PostgreSQL-backed lexical candidate adapter. PgVector's filter-only
 * query stays inside the server-owned per-base index and returns metadata only;
 * exact-term scoring then runs deterministically over that capped candidate set.
 */
export function createKnowledgeLexicalStore(
  vectorStore: KnowledgeVectorStore,
  scanLimit = 500,
): KnowledgeLexicalStore {
  const scan = async (indexName: string, knowledgeBaseId: string, retrievalVersion: number) =>
    vectorStore.query({
      indexName,
      topK: scanLimit,
      filter: { knowledgeBaseId, retrievalVersion },
    });

  return {
    async search({ indexName, knowledgeBaseId, retrievalVersion, query, topK }) {
      const queryTerms = terms(query);
      return (await scan(indexName, knowledgeBaseId, retrievalVersion))
        .map((hit) => ({
          ...hit,
          score: lexicalScore(
            queryTerms,
            `${String(hit.metadata?.headingPath ?? '')} ${String(hit.metadata?.text ?? '')}`,
          ),
        }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, topK);
    },
    async byIds({ indexName, knowledgeBaseId, retrievalVersion, ids }) {
      if (!ids.length) return [];
      const wanted = new Set(ids);
      return (await scan(indexName, knowledgeBaseId, retrievalVersion)).filter((hit) =>
        wanted.has(hit.id),
      );
    },
  };
}
