import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';
import { KNOWLEDGE_INGEST_TASK } from './knowledgeIngest';
import { KNOWLEDGE_RETRIEVAL_VERSION } from './knowledgeIngestRunner';

type BackfillPayload = {
  find: (args: unknown) => Promise<{ docs: { id: number | string }[] }>;
  update: (args: unknown) => Promise<unknown>;
  jobs: { queue: (args: unknown) => Promise<unknown> };
  logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
};

/** Documents indexed before the current retrieval version, oldest first. */
const staleWhere = {
  and: [
    { indexingStatus: { equals: INDEXING_STATUS.indexed } },
    {
      or: [
        { retrievalVersion: { exists: false } },
        { retrievalVersion: { less_than: KNOWLEDGE_RETRIEVAL_VERSION } },
      ],
    },
  ],
};

/**
 * Requeues documents whose indexed representation predates the current
 * retrieval version. Without this, bumping KNOWLEDGE_RETRIEVAL_VERSION would
 * only mark old chunks as stale while continuing to serve them: the new and old
 * embedding representations are not comparable, so mixed results rank
 * arbitrarily. Bounded per run so a large backlog drains over several boots
 * instead of saturating the queue at once.
 *
 * `onInit` runs in every process that boots Payload — the web container and
 * each worker replica — so this must run in exactly one of them or the same
 * documents get requeued once per container.
 */
export async function backfillStaleKnowledgeDocuments(
  payload: BackfillPayload,
  options: { limit?: number; isOwner?: boolean } = {},
): Promise<number> {
  const { limit = 50, isOwner = !process.env.PAYLOAD_WORKER } = options;
  if (!isOwner) return 0;

  const stale = await payload.find({
    collection: COLLECTIONS.knowledgeDocuments,
    where: staleWhere,
    limit,
    sort: 'updatedAt',
    overrideAccess: true,
  });

  let queued = 0;
  for (const document of stale.docs) {
    try {
      await payload.update({
        collection: COLLECTIONS.knowledgeDocuments,
        id: document.id,
        data: { indexingStatus: INDEXING_STATUS.pending, errorMessage: '' },
        overrideAccess: true,
        context: {
          [CTX.skipIngestQueue]: true,
          [CTX.trustedKnowledgeLifecycle]: true,
        },
      });
      await payload.jobs.queue({
        task: KNOWLEDGE_INGEST_TASK,
        input: { documentId: document.id },
      });
      queued += 1;
    } catch (err) {
      payload.logger.error({ err, documentId: document.id }, 'knowledge reindex backfill failed');
    }
  }

  if (queued > 0) {
    payload.logger.info(
      { queued, retrievalVersion: KNOWLEDGE_RETRIEVAL_VERSION },
      'queued stale knowledge documents for reindexing',
    );
  }
  return queued;
}
