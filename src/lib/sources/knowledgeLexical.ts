import type { KnowledgeQueryResult, KnowledgeVectorStore } from './knowledgeVector';
import type { KnowledgeLexicalStore } from './knowledgeRetrieval';

const MAX_TERMS = 16;
const MAX_IDS = 64;

function terms(value: string): string[] {
  return [...new Set(value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter((term) => term.length >= 2)
    .slice(0, MAX_TERMS);
}

export type KnowledgeSqlQuery = {
  indexName: string;
  knowledgeBaseId: string;
  retrievalVersion: number;
  topK: number;
  terms?: string[];
  ids?: string[];
};

export type KnowledgeSqlStore = {
  queryKnowledgeRows(args: KnowledgeSqlQuery): Promise<KnowledgeQueryResult[]>;
};

type LegacyKnowledgeSqlStore = KnowledgeSqlStore | KnowledgeVectorStore;

function isKnowledgeSqlStore(store: LegacyKnowledgeSqlStore): store is KnowledgeSqlStore {
  return typeof (store as Partial<KnowledgeSqlStore>).queryKnowledgeRows === 'function';
}

function legacyQueryKnowledgeRows(
  vectorStore: KnowledgeVectorStore,
): KnowledgeSqlStore['queryKnowledgeRows'] {
  return async ({ indexName, knowledgeBaseId, retrievalVersion, topK, terms: queryTerms, ids }) => {
    const rows = await vectorStore.query({
      indexName,
      topK: Math.max(topK, ids?.length ?? 0),
      filter: { knowledgeBaseId, retrievalVersion },
    });
    if (ids) {
      const wanted = new Set(ids);
      return rows.filter((row) => wanted.has(row.id)).slice(0, topK);
    }
    const wanted = queryTerms ?? [];
    return rows
      .map((row) => {
        const text = `${String(row.metadata?.headingPath ?? '')} ${String(row.metadata?.text ?? '')}`;
        const haystack = new Set(terms(text));
        const total = wanted.reduce(
          (sum, term) => sum + (/\d/.test(term) || term.length >= 8 ? 2 : 1),
          0,
        );
        const matched = wanted.reduce(
          (sum, term) =>
            sum + (haystack.has(term) ? (/\d/.test(term) || term.length >= 8 ? 2 : 1) : 0),
          0,
        );
        return { ...row, score: total ? matched / total : 0 };
      })
      .filter((row) => row.score > 0)
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
      .slice(0, topK);
  };
}

/** PostgreSQL lexical and direct-id adapter over the existing Mastra vector tables. */
export function createKnowledgeLexicalStore(
  sqlStore: LegacyKnowledgeSqlStore,
): KnowledgeLexicalStore {
  const queryKnowledgeRows = isKnowledgeSqlStore(sqlStore)
    ? sqlStore.queryKnowledgeRows.bind(sqlStore)
    : legacyQueryKnowledgeRows(sqlStore);
  const assertIndex = (indexName: string, knowledgeBaseId: string) => {
    if (!/^\d+$/.test(knowledgeBaseId) || indexName !== `knowledge_${knowledgeBaseId}`) {
      throw new Error('Knowledge index must match the server-owned numeric knowledge base');
    }
  };
  return {
    async search({ indexName, knowledgeBaseId, retrievalVersion, query, topK }) {
      assertIndex(indexName, knowledgeBaseId);
      const queryTerms = terms(query);
      if (!queryTerms.length) return [];
      return queryKnowledgeRows({
        indexName,
        knowledgeBaseId,
        retrievalVersion,
        terms: queryTerms,
        topK,
      });
    },
    async byIds({ indexName, knowledgeBaseId, retrievalVersion, ids }) {
      assertIndex(indexName, knowledgeBaseId);
      const uniqueIds = [...new Set(ids)].slice(0, MAX_IDS).sort();
      if (!uniqueIds.length) return [];
      return queryKnowledgeRows({
        indexName,
        knowledgeBaseId,
        retrievalVersion,
        ids: uniqueIds,
        topK: uniqueIds.length,
      });
    },
  };
}
