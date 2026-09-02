import type { Payload } from 'payload';

import type { AgentRun, Presentation } from '@/payload-types';
import { mastra } from '../agents/mastra';
import { chooseFontPairForBrief } from '../agents/fonts';
import { persistSlides } from '../agents/tools/persist';
import { deckContext } from '../lib/deckContext';
import { currentDeckContext } from '../lib/currentDeckContext';
import { COLLECTIONS } from '../lib/collections';
import { CTX } from '../lib/context';
import { DRAFT_STATUS, type DraftStatus } from '../lib/status';
import { createDeckRequestContext } from '../agents/requestContext';
import { SourceResearchError, type SourceFailure } from '../lib/sources/types';
import { sanitizeRunError } from './agentRunLifecycle';

const MAX_EVENTS = 200;
type DraftEvent = { ts: number; phase: string; detail?: unknown };

const PHASE_STATUS: Record<string, DraftStatus> = {
  gather: DRAFT_STATUS.gathering,
  structure: DRAFT_STATUS.structuring,
  approval: DRAFT_STATUS.validating,
  draft: DRAFT_STATUS.drafting,
  validate: DRAFT_STATUS.validating,
  visual: DRAFT_STATUS.building,
  assemble: DRAFT_STATUS.building,
  persist: DRAFT_STATUS.building,
  complete: DRAFT_STATUS.done,
};

export function normalizeWorkflowPhase(phase: string): string | undefined {
  const base = phase.split(':')[0];
  return base && base in PHASE_STATUS ? base : undefined;
}

function idOf(value: number | { id: number } | null | undefined): number | undefined {
  return typeof value === 'object' ? value?.id : (value ?? undefined);
}

async function patchRun(payload: Payload, run: AgentRun, data: Record<string, unknown>) {
  return payload.update({
    collection: COLLECTIONS.agentRuns,
    id: run.id,
    data,
    overrideAccess: true,
  });
}

async function mirrorPresentation(payload: Payload, run: AgentRun, data: Record<string, unknown>) {
  const presentationId = idOf(run.presentation)!;
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    depth: 0,
    disableErrors: true,
  });
  if (presentation?.draftRunId !== run.mastraRunId) return false;
  await payload.update({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    data,
    overrideAccess: true,
    context: { [CTX.skipBuildQueue]: true },
  });
  return true;
}

async function finalizeSuccess(
  payload: Payload,
  run: AgentRun,
  deck: Awaited<ReturnType<typeof consumeResult>>,
) {
  const presentationId = idOf(run.presentation)!;
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    depth: 2,
  });
  if (presentation.draftRunId !== run.mastraRunId) return;
  const latest =
    run.mode === 'augment'
      ? await payload.findByID({
          collection: COLLECTIONS.presentations,
          id: presentationId,
          depth: 2,
        })
      : null;
  await persistSlides({
    payload,
    presentationId,
    slides: deck.slides,
    mode: run.mode,
    existing: run.mode === 'augment' ? (latest?.slides as Presentation['slides']) : undefined,
  });
  const organisationId = idOf(run.organisation);
  if (organisationId) {
    try {
      const fontPair = await chooseFontPairForBrief(run.brief);
      await payload.update({
        collection: COLLECTIONS.organisations,
        id: organisationId,
        data: fontPair,
        overrideAccess: true,
      });
    } catch (error) {
      payload.logger.warn(`Agent font selection failed: ${String(error)}`);
    }
  }
}

type DeckResult = {
  slides: Parameters<typeof persistSlides>[0]['slides'];
  evidence?: Array<{ sourceId: string }>;
  sourceFailures?: unknown[];
};

async function consumeResult(result: unknown): Promise<DeckResult> {
  const value = result as { status?: string; result?: DeckResult; error?: { message?: string } };
  if (value.status !== 'success' || !value.result) {
    throw new Error(
      `[deckWorkflow] run ${value.status ?? 'unknown'}${
        value.status === 'failed' ? `: ${value.error?.message ?? ''}` : ''
      }`,
    );
  }
  return value.result;
}

async function consumeWorkflowStream(
  stream: AsyncIterable<unknown>,
  mirror: (phase: string, detail?: unknown) => Promise<void>,
) {
  for await (const raw of stream) {
    const chunk = raw as {
      type?: string;
      phase?: string;
      detail?: unknown;
      payload?: {
        id?: string;
        phase?: string;
        detail?: unknown;
        completedCount?: number;
        totalCount?: number;
      };
    };
    if (chunk.type === 'workflow-step-start' && chunk.payload?.id) {
      await mirror(chunk.payload.id);
    }
    if (chunk.type === 'workflow-step-progress' && chunk.payload?.id) {
      await mirror(chunk.payload.id, {
        completed: chunk.payload.completedCount,
        total: chunk.payload.totalCount,
      });
    }
    const phase = chunk.phase ?? chunk.payload?.phase;
    if (chunk.type === 'deck-event' && phase) {
      await mirror(phase, chunk.detail ?? chunk.payload?.detail);
    }
  }
}

function sourceFailuresFromError(error: unknown): SourceFailure[] {
  if (error instanceof SourceResearchError) return error.failures;
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/SOURCE_FAILURES:(\[[^\n]+?\])\s/);
  if (!match?.[1]) return [];
  try {
    return JSON.parse(match[1]) as SourceFailure[];
  } catch {
    return [];
  }
}

async function executeWorkflow(
  payload: Payload,
  ledger: AgentRun,
  presentationId: number,
  mirror: (phase: string, detail?: unknown) => Promise<void>,
): Promise<unknown> {
  const workflow = mastra.getWorkflow('deckWorkflow');
  const run = await workflow.createRun({
    runId: ledger.mastraRunId,
    resourceId: String(presentationId),
  });
  const tracingOptions = {
    traceId: ledger.traceId,
    hideInput: true,
    hideOutput: true,
    tags: ['deck-build', ledger.mode, ledger.visual === false ? 'no-visual' : 'visual'],
  };
  const requestContext = createDeckRequestContext({
    requestId: ledger.requestId,
    presentationId: String(presentationId),
    runId: ledger.mastraRunId,
    userId: String(idOf(ledger.createdBy) ?? ''),
    organizationId: idOf(ledger.organisation)?.toString(),
    phase: 'gather',
  }) as never;

  if (ledger.command === 'restart') {
    const result = await run.restart({ requestContext, tracingOptions });
    const resultState = result as { status?: string; error?: unknown };
    if (resultState.status === 'failed') {
      const sourceFailures = sourceFailuresFromError(resultState.error);
      if (sourceFailures.length > 0) {
        throw new SourceResearchError('Source research failed', sourceFailures);
      }
    }
    return result;
  }
  if (ledger.command === 'resume') {
    const stream = run.resumeStream({
      step: 'approval',
      resumeData: ledger.resumeDecision,
      requestContext,
      tracingOptions,
    });
    await consumeWorkflowStream(stream, mirror);
    return stream.result;
  }
  if (ledger.command === 'timeTravel') {
    const stream = run.timeTravelStream({
      step: ledger.targetStep!,
      requestContext,
      tracingOptions,
    });
    await consumeWorkflowStream(stream, mirror);
    return stream.result;
  }

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    depth: 2,
  });
  const revisionContext =
    ledger.mode === 'revise'
      ? await currentDeckContext(presentation.slides, payload)
      : (ledger.revisionContext ?? undefined);
  const revisionBrief = revisionContext
    ? `${deckContext(presentation)}DECK EXISTANT À RÉVISER :\n${revisionContext}\n\n---\n\nDEMANDE DE RÉVISION :\n${ledger.brief}`
    : deckContext(presentation) + ledger.brief;
  const stream = run.stream({
    inputData: {
      brief: revisionBrief,
      language: ledger.language,
      title: presentation.title ?? undefined,
      visual: ledger.visual !== false,
      sourcePolicy: {
        mode: ledger.sourcePolicy ?? 'none',
        sourceIds: Array.isArray(ledger.sourceIds) ? (ledger.sourceIds as string[]) : [],
      },
      revisionContext,
      approvalRequired: ledger.approvalRequired === true,
    },
    requestContext,
    tracingOptions,
  });
  await consumeWorkflowStream(stream, mirror);
  return stream.result;
}

function failureDetail(message: string, sourceFailures: SourceFailure[]) {
  return {
    message,
    ...(sourceFailures.length > 0 ? { sourceFailures } : {}),
  };
}

export async function runAgentCommand(payload: Payload, agentRunId: number | string) {
  let ledger = (await payload.findByID({
    collection: COLLECTIONS.agentRuns,
    id: agentRunId,
    depth: 0,
    overrideAccess: true,
  })) as AgentRun;
  const presentationId = idOf(ledger.presentation)!;
  const events = (Array.isArray(ledger.events) ? ledger.events : []) as DraftEvent[];
  const mirror = async (phase: string, detail?: unknown) => {
    const durablePhase = normalizeWorkflowPhase(phase);
    if (!durablePhase) return;
    events.push({ ts: Date.now(), phase, detail });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    await patchRun(payload, ledger, {
      status: 'running',
      phase: durablePhase,
      heartbeatAt: new Date().toISOString(),
      events,
    });
    const status = PHASE_STATUS[durablePhase];
    await mirrorPresentation(payload, ledger, {
      ...(status ? { draftStatus: status } : {}),
      draftEvents: events,
    });
  };

  try {
    ledger = (await patchRun(payload, ledger, {
      status: 'running',
      startedAt: ledger.startedAt ?? new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      attempt: (ledger.attempt ?? 0) + 1,
      errorCode: null,
      errorSummary: null,
    })) as AgentRun;
    const workflowResult = await executeWorkflow(payload, ledger, presentationId, mirror);

    const state = workflowResult as { status?: string; suspended?: unknown };
    if (state.status === 'suspended') {
      await patchRun(payload, ledger, {
        status: 'suspended',
        phase: 'approval',
        suspendedStep: 'approval',
        suspendPayload: state.suspended,
        suspendedAt: new Date().toISOString(),
        heartbeatAt: new Date().toISOString(),
      });
      await mirrorPresentation(payload, ledger, {
        draftStatus: DRAFT_STATUS.validating,
        draftEvents: [...events, { ts: Date.now(), phase: 'approval', detail: state.suspended }],
      });
      return { success: true, runId: ledger.mastraRunId, suspended: true };
    }

    const deck = await consumeResult(workflowResult);
    await finalizeSuccess(payload, ledger, deck);
    const usedSources = [...new Set((deck.evidence ?? []).map((item) => item.sourceId))];
    await patchRun(payload, ledger, {
      status: 'succeeded',
      phase: 'complete',
      evidence: deck.evidence ?? [],
      sourceFailures: deck.sourceFailures ?? [],
      completedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      events: [...events, { ts: Date.now(), phase: 'done' }],
    });
    await mirrorPresentation(payload, ledger, {
      agentBrief: ledger.brief,
      draftStatus: DRAFT_STATUS.done,
      draftSources: usedSources,
      draftEvidence: deck.evidence ?? [],
      draftEvents: [...events, { ts: Date.now(), phase: 'done' }],
    });
    return { success: true, runId: ledger.mastraRunId, suspended: false };
  } catch (error) {
    const message = sanitizeRunError(error);
    const sourceFailures = sourceFailuresFromError(error);
    const detail = failureDetail(message, sourceFailures);
    await patchRun(payload, ledger, {
      status: 'failed',
      errorCode: sourceFailures.length > 0 ? 'source-unavailable' : 'agent-run-failed',
      errorSummary: message,
      sourceFailures,
      completedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      events: [...events, { ts: Date.now(), phase: 'failed', detail }].slice(-MAX_EVENTS),
    });
    await mirrorPresentation(payload, ledger, {
      draftStatus: DRAFT_STATUS.failed,
      draftEvents: [...events, { ts: Date.now(), phase: 'failed', detail }].slice(-MAX_EVENTS),
    });
    payload.logger.error(`[agent-run:${ledger.mastraRunId}] ${message}`);
    return { success: false, runId: ledger.mastraRunId, suspended: false };
  }
}
