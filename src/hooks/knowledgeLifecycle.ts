import type { CollectionBeforeDeleteHook } from 'payload';

import {
  getKnowledgeVectorStore,
  knowledgeIndexName,
  relationId,
} from '../jobs/knowledgeIngestRunner';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';

type LifecycleVectorStore = Pick<
  ReturnType<typeof getKnowledgeVectorStore>,
  'deleteIndex' | 'deleteVectors'
>;

/**
 * Purge the index before deleting authoritative Payload records. A vector-store
 * failure aborts with every document intact. If a later database delete fails,
 * the remaining Payload documents are still visible and can be reindexed.
 */
export async function beforeKnowledgeBaseDelete(
  { id, req }: Parameters<CollectionBeforeDeleteHook>[0],
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  await vectorStore.deleteIndex({ indexName: knowledgeIndexName(id) });
  await req.payload.delete({
    collection: COLLECTIONS.knowledgeDocuments,
    where: { knowledgeBase: { equals: id } },
    overrideAccess: true,
    context: { ...(req.context ?? {}), [CTX.skipDocumentVectorPurge]: true },
    req,
  });
}

/** Purge vectors before Payload irreversibly removes a standalone document. */
export async function beforeKnowledgeDocumentDelete(
  { id, req }: Parameters<CollectionBeforeDeleteHook>[0],
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  if (req.context?.[CTX.skipDocumentVectorPurge]) return;

  const document = await req.payload.findByID({
    collection: COLLECTIONS.knowledgeDocuments,
    id,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const knowledgeBaseId = relationId(document.knowledgeBase);
  if (knowledgeBaseId === undefined) return;

  await vectorStore.deleteVectors({
    indexName: knowledgeIndexName(knowledgeBaseId),
    filter: { documentId: String(id) },
  });
}

export async function purgeDocumentFromPreviousBase(
  documentId: number | string,
  previousKnowledgeBaseId: number | string,
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  await vectorStore.deleteVectors({
    indexName: knowledgeIndexName(previousKnowledgeBaseId),
    filter: { documentId: String(documentId) },
  });
}
