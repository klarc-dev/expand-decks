import type { CollectionAfterChangeHook } from 'payload';

import { KNOWLEDGE_INGEST_TASK } from '../jobs/knowledgeIngest';
import { relationId } from '../jobs/knowledgeIngestRunner';
import { purgeDocumentFromPreviousBase } from './knowledgeLifecycle';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';

function fileChanged(
  doc: Record<string, unknown>,
  previousDoc: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): boolean {
  const uploadFieldChanged = Object.hasOwn(data, 'filename');
  return (
    !previousDoc ||
    uploadFieldChanged ||
    doc.filename !== previousDoc.filename ||
    doc.mimeType !== previousDoc.mimeType ||
    relationId(doc.knowledgeBase as never) !== relationId(previousDoc.knowledgeBase as never)
  );
}

export const afterKnowledgeDocumentChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  data,
  req,
  operation,
}) => {
  if (req.context?.[CTX.skipIngestQueue]) return doc;
  if (operation !== 'create' && operation !== 'update') return doc;
  if (operation === 'update' && !fileChanged(doc, previousDoc, data as Record<string, unknown>))
    return doc;

  if (operation === 'update' && previousDoc) {
    const oldBaseId = relationId(previousDoc.knowledgeBase as never);
    const newBaseId = relationId(doc.knowledgeBase as never);
    if (oldBaseId !== undefined && newBaseId !== oldBaseId) {
      await purgeDocumentFromPreviousBase(doc.id, oldBaseId);
    }
  }

  await req.payload.update({
    collection: 'knowledge-documents',
    id: doc.id,
    data: { indexingStatus: INDEXING_STATUS.pending, errorMessage: '' },
    overrideAccess: true,
    req,
    context: {
      [CTX.skipIngestQueue]: true,
      [CTX.trustedKnowledgeLifecycle]: true,
    },
  });

  await (req.payload.jobs.queue as Function)({
    task: KNOWLEDGE_INGEST_TASK,
    input: { documentId: doc.id },
    req,
  });

  return doc;
};
