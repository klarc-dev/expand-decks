import type { CollectionAfterChangeHook } from 'payload';

import { KNOWLEDGE_INGEST_TASK } from '../jobs/knowledgeIngest';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';

function fileChanged(doc: Record<string, unknown>, previousDoc?: Record<string, unknown>): boolean {
  return (
    !previousDoc || doc.filename !== previousDoc.filename || doc.mimeType !== previousDoc.mimeType
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

  await req.payload.update({
    collection: 'knowledge-documents',
    id: doc.id,
    data: { indexingStatus: INDEXING_STATUS.pending, errorMessage: '', chunkCount: 0 },
    overrideAccess: true,
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
