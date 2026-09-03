import type { CollectionAfterChangeHook } from 'payload';

import { KNOWLEDGE_INGEST_TASK } from '../jobs/knowledgeIngest';
import { relationId } from '../jobs/knowledgeIngestRunner';
import { purgeDocumentFromPreviousBase } from './knowledgeLifecycle';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';

function fileChanged(doc: Record<string, unknown>, previousDoc?: Record<string, unknown>): boolean {
  return (
    !previousDoc ||
    doc.filename !== previousDoc.filename ||
    doc.mimeType !== previousDoc.mimeType ||
    relationId(doc.knowledgeBase as never) !== relationId(previousDoc.knowledgeBase as never)
  );
}

export const afterKnowledgeDocumentChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (req.context?.[CTX.skipIngestQueue]) return doc;
  if (operation !== 'create' && operation !== 'update') return doc;
  if (operation === 'update' && !fileChanged(doc, previousDoc)) return doc;

  if (operation === 'update' && previousDoc) {
    const oldBaseId = relationId(previousDoc.knowledgeBase as never);
    const newBaseId = relationId(doc.knowledgeBase as never);
    if (oldBaseId !== undefined && newBaseId !== oldBaseId) {
      await purgeDocumentFromPreviousBase(req, doc.id, oldBaseId);
    }
  }

  await req.payload.update({
    collection: 'knowledge-documents',
    id: doc.id,
    data: { indexingStatus: INDEXING_STATUS.pending, errorMessage: '', chunkCount: 0 },
    overrideAccess: true,
    context: { [CTX.skipIngestQueue]: true },
  });

  await (req.payload.jobs.queue as Function)({
    task: KNOWLEDGE_INGEST_TASK,
    input: { documentId: doc.id },
    req,
  });

  // fallow-ignore-next-line code-duplication -- established fire-and-forget Payload jobs pattern
  void Promise.resolve()
    .then(() => (req.payload.jobs.run as Function)())
    .catch((err: unknown) => {
      req.payload.logger?.warn?.(
        { err, documentId: doc.id },
        'on-demand jobs.run after knowledge document change failed; autoRun will retry',
      );
    });

  return doc;
};
