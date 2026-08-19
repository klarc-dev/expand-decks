import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Presentation } from '@/payload-types';
import { z } from 'zod';

import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { DRAFT_STATUS, type DraftStatus } from '@/lib/status';
import { deckContext } from '@/lib/deckContext';
import { currentDeckContext } from '@/lib/currentDeckContext';
import { ROLES } from '@/access/roles';
import { mastra } from '@/agents/mastra';
import { chooseFontPairForBrief } from '@/agents/fonts';
import { persistSlides } from '@/agents/tools/persist';
import { resolveSources } from '@/lib/sources/resolve';
import { TooManySourcesError, UnknownSourceError } from '@/lib/sources/types';

export const maxDuration = 800; // Vercel hint; RUN_TIMEOUT_MS below enforces local timeout.

// A wedged step must not leave draftStatus stuck in an ACTIVE phase forever (it
// also permanently trips the re-entrancy guard below). stream() exposes no
// abortSignal in @mastra/core@1.41.0, so we race the consume loop against this
// timer and throw on expiry → the catch path persists `failed` for retry.
const RUN_TIMEOUT_MS = (maxDuration - 30) * 1000;

const requestSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(20000),
  mode: z.enum(['replace', 'augment', 'revise']).default('replace'),
  visual: z.boolean().default(true),
  sourceIds: z.array(z.string()).optional(),
});

type DraftEvent = { ts: number; phase: string; detail?: unknown };

const ACTIVE = new Set([
  DRAFT_STATUS.gathering,
  DRAFT_STATUS.structuring,
  DRAFT_STATUS.drafting,
  DRAFT_STATUS.validating,
  DRAFT_STATUS.building,
] as string[]);

const PHASE_STATUS: Record<string, DraftStatus> = {
  gather: DRAFT_STATUS.gathering,
  structure: DRAFT_STATUS.structuring,
  draft: DRAFT_STATUS.drafting,
  validate: DRAFT_STATUS.validating,
  build: DRAFT_STATUS.building,
  visual: DRAFT_STATUS.building,
  done: DRAFT_STATUS.done,
};

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Requête invalide', issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { presentationId, brief, mode, visual, sourceIds: requestedSourceIds } = parsed.data;

  // Validate selected sources against the runtime registry before starting a run.
  let sourceIds: string[] = [];
  try {
    sourceIds = resolveSources(requestedSourceIds).map((s) => s.id);
  } catch (err) {
    if (err instanceof UnknownSourceError) {
      return Response.json(
        { error: `Unknown source id(s): ${err.unknownIds.join(', ')}` },
        { status: 400 },
      );
    }
    if (err instanceof TooManySourcesError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    user,
    disableErrors: true,
  });
  if (!presentation) {
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  }

  const createdById =
    typeof presentation.createdBy === 'object'
      ? presentation.createdBy?.id
      : presentation.createdBy;
  const organisationId =
    typeof presentation.organisation === 'object'
      ? presentation.organisation?.id
      : presentation.organisation;
  if (user.role !== ROLES.admin && createdById !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Re-entrancy guard: refuse a second run while one is active.
  if (ACTIVE.has((presentation as { draftStatus?: string }).draftStatus ?? '')) {
    return NextResponse.json({ error: 'Un build agentique est déjà en cours' }, { status: 409 });
  }

  const events: DraftEvent[] = [];
  let currentRunId: string | undefined;
  const isCurrentRun = async () => {
    if (!currentRunId) return true;
    const latest = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      user,
      disableErrors: true,
    });
    return latest?.draftRunId === currentRunId;
  };
  const mirror = async (phase: string, detail?: unknown) => {
    events.push({ ts: Date.now(), phase, detail });
    if (!(await isCurrentRun())) return;
    const mapped = PHASE_STATUS[phase.split(':')[0]!];
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: mapped ? { draftStatus: mapped, draftEvents: events } : { draftEvents: events },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });
  };

  // Claim before returning so a second click sees an active draftStatus.
  await mirror('gather');

  // Fire-and-forget: the run is long; the button polls draftStatus/draftEvents.
  // fallow-ignore-next-line complexity — async orchestration fan-out, extracted helpers would only move the branches
  void (async () => {
    let timedOut = false;
    try {
      // Each step id is a draftStatus phase: workflow-step-start fires as a step
      // begins (payload.id = the step id), and the foreach writers emit
      // workflow-step-progress per drafted slide.
      const run = await mastra
        .getWorkflow('deckWorkflow')
        .createRun({ resourceId: String(presentationId) });
      currentRunId = run.runId;
      await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { draftRunId: run.runId },
        user,
        context: { [CTX.skipBuildQueue]: true },
      });
      const revisionContext =
        mode === 'revise' ? await currentDeckContext(presentation.slides, payload) : undefined;
      const revisionBrief = revisionContext
        ? `${deckContext(presentation)}DECK EXISTANT À RÉVISER :\n${revisionContext}\n\n---\n\nDEMANDE DE RÉVISION :\n${brief}`
        : deckContext(presentation) + brief;
      const stream = run.stream({
        inputData: { brief: revisionBrief, sourceIds, revisionContext },
        initialState: { visual, title: presentation.title ?? undefined },
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          // Best-effort cancel so the run stops spending tokens; ignore if the
          // installed Mastra build doesn't support cancel().
          void (run as { cancel?: () => Promise<void> }).cancel?.().catch(() => {});
          reject(new Error(`run exceeded ${RUN_TIMEOUT_MS}ms`));
        }, RUN_TIMEOUT_MS);
      });

      const consume = (async () => {
        for await (const chunk of stream) {
          if (timedOut) break;
          if (chunk.type === 'workflow-step-start') {
            await mirror(chunk.payload.id);
          } else if (chunk.type === 'workflow-step-progress') {
            await mirror('draft', {
              completed: chunk.payload.completedCount,
              total: chunk.payload.totalCount,
            });
          }
        }
        return stream.result;
      })();

      const result = await Promise.race([consume, timeout]).finally(() => clearTimeout(timer));
      if (result.status !== 'success') {
        throw new Error(
          `[deckWorkflow] run ${result.status}` +
            (result.status === 'failed' ? `: ${result.error?.message ?? ''}` : ''),
        );
      }
      const deck = result.result;
      const latest =
        mode === 'augment'
          ? await payload.findByID({
              collection: COLLECTIONS.presentations,
              id: presentationId,
              user,
              disableErrors: true,
            })
          : null;

      if (!(await isCurrentRun())) return;
      await persistSlides({
        payload,
        presentationId,
        slides: deck.slides,
        mode,
        existing: mode === 'augment' ? (latest?.slides as Presentation['slides']) : undefined,
        user,
      });
      if (organisationId && (await isCurrentRun())) {
        try {
          const fontPair = await chooseFontPairForBrief(brief);
          await payload.update({
            collection: COLLECTIONS.organisations,
            id: organisationId,
            data: fontPair,
            user,
          });
          await mirror('fonts', fontPair);
        } catch (fontError) {
          console.warn('[agent-draft] font pair selection skipped', fontError);
        }
      }
      if (!(await isCurrentRun())) return;
      await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: {
          draftStatus: DRAFT_STATUS.done,
          draftSources: sourceIds,
          draftEvidence: deck.evidence ?? [],
        },
        user,
        context: { [CTX.skipBuildQueue]: true },
      });
    } catch (error) {
      console.error('[agent-draft] run failed', error);
      events.push({ ts: Date.now(), phase: 'failed', detail: String((error as Error)?.message) });
      try {
        if (await isCurrentRun()) {
          await payload.update({
            collection: COLLECTIONS.presentations,
            id: presentationId,
            data: { draftStatus: DRAFT_STATUS.failed, draftEvents: events },
            user,
            context: { [CTX.skipBuildQueue]: true },
          });
        }
      } catch (statusError) {
        console.error('[agent-draft] failed to persist failed status', statusError);
      }
    }
  })();

  return NextResponse.json({ started: true });
}
