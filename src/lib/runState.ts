import { DRAFT_STATUS, type DraftStatus } from './status';

/**
 * Reconcile the cheap per-step draftStatus mirror against the durable Mastra run
 * status so a recycled/dead run can't leave the admin polling an ACTIVE phase
 * forever. The mirror drives live progress; the durable status (from
 * GET /api/agent-draft/[runId]) is the authority on whether the run is still
 * alive. When the mirror is still ACTIVE but the durable run is terminal, the
 * run died between status writes — surface its real outcome.
 */
const ACTIVE: ReadonlySet<string> = new Set<string>([
  DRAFT_STATUS.gathering,
  DRAFT_STATUS.structuring,
  DRAFT_STATUS.drafting,
  DRAFT_STATUS.validating,
  DRAFT_STATUS.building,
]);

/** Durable run states that mean the run can no longer make progress, badly. */
const DURABLE_FAILED: ReadonlySet<string> = new Set(['failed', 'tripwire', 'canceled', 'bailed']);

type ReconciledRunState = 'idle' | 'active' | 'done' | 'failed';

export function reconcileRunState(
  draftStatus: DraftStatus | string,
  durableStatus: string | undefined,
): ReconciledRunState {
  if (draftStatus === DRAFT_STATUS.done) return 'done';
  if (draftStatus === DRAFT_STATUS.failed) return 'failed';

  if (ACTIVE.has(draftStatus)) {
    if (durableStatus === 'success') return 'done';
    if (durableStatus && DURABLE_FAILED.has(durableStatus)) return 'failed';
    return 'active';
  }

  return 'idle';
}
