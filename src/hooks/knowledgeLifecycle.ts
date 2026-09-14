import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload';

import {
  getKnowledgeVectorStore,
  knowledgeIndexName,
  relationId,
} from '../jobs/knowledgeIngestRunner';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';
import type { KnowledgeSourceReadiness } from '../lib/sources/types';

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

/**
 * Readiness of a base, derived from its documents: the stored field the admin
 * and the source registry both read instead of re-scanning documents.
 */
function knowledgeReadiness(
  documents: { indexingStatus?: string | null }[],
): KnowledgeSourceReadiness {
  if (documents.length === 0) return 'empty';
  if (documents.some((document) => document.indexingStatus === INDEXING_STATUS.indexed))
    return 'ready';
  if (documents.every((document) => document.indexingStatus === INDEXING_STATUS.failed))
    return 'failed';
  return 'unavailable';
}

/** Recompute and persist `readiness` for one base. Safe to call repeatedly. */
export async function syncKnowledgeBaseReadiness(
  payload: Payload,
  baseId: number | string,
  req?: PayloadRequest,
): Promise<void> {
  const documents = await payload.find({
    collection: COLLECTIONS.knowledgeDocuments,
    where: { knowledgeBase: { equals: baseId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });

  await payload.update({
    collection: COLLECTIONS.knowledgeBases,
    id: baseId,
    // Bases have no afterChange hook, so this write cannot re-enter the
    // document lifecycle; the context flag keeps that true if one is added.
    data: { readiness: knowledgeReadiness(documents.docs as { indexingStatus?: string }[]) },
    overrideAccess: true,
    context: { [CTX.trustedKnowledgeLifecycle]: true },
    req,
  });
}

/**
 * Always runs — unlike the ingestion hook, which returns early for lifecycle
 * writes whose whole point is to move a document's indexing status.
 */
export const syncKnowledgeReadinessAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const baseId = relationId(doc.knowledgeBase as never);
  const previousBaseId = relationId(previousDoc?.knowledgeBase as never);
  if (baseId !== undefined) await syncKnowledgeBaseReadiness(req.payload, baseId, req);
  if (previousBaseId !== undefined && previousBaseId !== baseId) {
    await syncKnowledgeBaseReadiness(req.payload, previousBaseId, req);
  }
  return doc;
};

export const syncKnowledgeReadinessAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const baseId = relationId(doc.knowledgeBase as never);
  if (baseId !== undefined) await syncKnowledgeBaseReadiness(req.payload, baseId, req);
  return doc;
};
