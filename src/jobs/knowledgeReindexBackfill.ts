import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { INDEXING_STATUS } from '../lib/status';
import { KNOWLEDGE_INGEST_TASK } from './knowledgeIngest';
import { KNOWLEDGE_RETRIEVAL_VERSION } from './knowledgeIngestRunner';

const BACKFILL_INTERVAL_MS = 60_000;

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
 * arbitrarily. Each run claims one bounded batch and the owner schedules another
 * run only when work was queued, so large backlogs drain without an unbounded
 * startup loop or duplicate queue flood.
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

  let queued = 0;
  const stale = await payload.find({
    collection: COLLECTIONS.knowledgeDocuments,
    where: staleWhere,
    limit,
    sort: 'updatedAt',
    overrideAccess: true,
  });
  for (const document of stale.docs) {
    try {
      // Queue first: a crash or queue rejection leaves the document stale and
      // retryable. The ingest task's per-document superseding key makes a
      // duplicate queued before a failed status patch harmless.
      await payload.jobs.queue({
        task: KNOWLEDGE_INGEST_TASK,
        input: { documentId: document.id },
      });
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

/**
 * Schedule one bounded claim per interval. Empty runs remain scheduled so
 * transient queue/database failures and newly stale rows are retried without a
 * process restart.
 */
export function startKnowledgeReindexBackfill(
  payload: BackfillPayload,
  options: { limit?: number; intervalMs?: number; isOwner?: boolean } = {},
): () => void {
  const { intervalMs = BACKFILL_INTERVAL_MS, ...backfillOptions } = options;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (stopped) return;
    try {
      await backfillStaleKnowledgeDocuments(payload, backfillOptions);
    } catch (err) {
      payload.logger.error({ err }, 'knowledge reindex backlog drain failed');
    }
    if (!stopped) {
      timer = setTimeout(run, intervalMs);
      timer.unref?.();
    }
  };
  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
