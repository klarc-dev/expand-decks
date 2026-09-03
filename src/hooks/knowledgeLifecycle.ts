import type {
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload';

import {
  getKnowledgeVectorStore,
  knowledgeIndexName,
  relationId,
  updateKnowledgeBaseSummary,
} from '../jobs/knowledgeIngestRunner';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';

type LifecycleVectorStore = Pick<
  ReturnType<typeof getKnowledgeVectorStore>,
  'deleteIndex' | 'deleteVectors'
>;

export const beforeKnowledgeBaseDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: COLLECTIONS.knowledgeDocuments,
    where: { knowledgeBase: { equals: id } },
    overrideAccess: true,
    context: { ...(req.context ?? {}), [CTX.skipDocumentVectorPurge]: true },
    req,
  });
};

export async function afterKnowledgeBaseDelete(
  { doc }: Parameters<CollectionAfterDeleteHook>[0],
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  await vectorStore.deleteIndex({ indexName: knowledgeIndexName(doc.id) });
  return doc;
}

export async function afterKnowledgeDocumentDelete(
  { doc, req }: Parameters<CollectionAfterDeleteHook>[0],
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  const knowledgeBaseId = relationId(doc.knowledgeBase);
  if (knowledgeBaseId === undefined) return doc;

  if (!req.context?.[CTX.skipDocumentVectorPurge]) {
    await vectorStore.deleteVectors({
      indexName: knowledgeIndexName(knowledgeBaseId),
      filter: { documentId: String(doc.id) },
    });
  }

  await updateKnowledgeBaseSummary(
    req.payload as Pick<Payload, 'db' | 'find' | 'findByID' | 'logger' | 'update'>,
    knowledgeBaseId,
  );
  return doc;
}

export async function purgeDocumentFromPreviousBase(
  req: Pick<PayloadRequest, 'payload'>,
  documentId: number | string,
  previousKnowledgeBaseId: number | string,
  vectorStore: LifecycleVectorStore = getKnowledgeVectorStore(),
) {
  await vectorStore.deleteVectors({
    indexName: knowledgeIndexName(previousKnowledgeBaseId),
    filter: { documentId: String(documentId) },
  });
  await updateKnowledgeBaseSummary(
    req.payload as Pick<Payload, 'db' | 'find' | 'findByID' | 'logger' | 'update'>,
    previousKnowledgeBaseId,
  );
}
