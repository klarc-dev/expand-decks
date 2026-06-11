import { NextResponse, type NextRequest } from 'next/server';

import { getPayload } from 'payload';
import config from '@payload-config';
import type { Presentation } from '@/payload-types';
import { z } from 'zod';

import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { DRAFT_STATUS, type DraftStatus } from '@/lib/status';
import { deckContext } from '@/lib/deckContext';
import { ROLES } from '@/access/roles';
import { mastra } from '@/agents/mastra';
import { persistSlides } from '@/agents/tools/persist';

export const maxDuration = 800; // self-hosted; the agentic run is long-running

// A wedged step must not leave draftStatus stuck in an ACTIVE phase forever (it
// also permanently trips the re-entrancy guard below). stream() exposes no
// abortSignal in @mastra/core@1.41.0, so we race the consume loop against this
// timer and throw on expiry → the catch path persists `failed` for retry.
const RUN_TIMEOUT_MS = (maxDuration - 30) * 1000;

const requestSchema = z.object({
  presentationId: z.union([z.string().min(1).max(128), z.number()]),
  brief: z.string().trim().min(10).max(20000),
  mode: z.enum(['replace', 'augment']).default('replace'),
  visual: z.boolean().default(true),
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
    return NextResponse.json({ error: 'presentationId et brief sont requis' }, { status: 400 });
  }
  const { presentationId, brief, mode, visual } = parsed.data;

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
  if (user.role !== ROLES.admin && createdById !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Re-entrancy guard: refuse a second run while one is active.
  if (ACTIVE.has((presentation as { draftStatus?: string }).draftStatus ?? '')) {
    return NextResponse.json({ error: 'Un build agentique est déjà en cours' }, { status: 409 });
  }

  const events: DraftEvent[] = [];
  const mirror = async (phase: string, detail?: unknown) => {
    events.push({ ts: Date.now(), phase, detail });
    const mapped = PHASE_STATUS[phase.split(':')[0]!];
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: mapped ? { draftStatus: mapped, draftEvents: events } : { draftEvents: events },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });
  };

  // Fire-and-forget: the run is long; the button polls draftStatus/draftEvents.
  void (async () => {
    try {
      await mirror('gather');

      // Each step id is a draftStatus phase: workflow-step-start fires as a step
      // begins (payload.id = the step id), and the foreach writers emit
      // workflow-step-progress per drafted slide.
      const run = await mastra
        .getWorkflow('deckWorkflow')
        .createRun({ resourceId: String(presentationId) });
      await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { draftRunId: run.runId },
        user,
        context: { [CTX.skipBuildQueue]: true },
      });
      const stream = run.stream({
        inputData: { brief: deckContext(presentation) + brief },
        initialState: { visual, title: presentation.title ?? undefined },
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`run exceeded ${RUN_TIMEOUT_MS}ms`)),
          RUN_TIMEOUT_MS,
        );
      });

      const consume = (async () => {
        for await (const chunk of stream) {
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

      await persistSlides({
        payload,
        presentationId,
        slides: deck.slides,
        mode,
        existing: mode === 'augment' ? (presentation.slides as Presentation['slides']) : undefined,
        user,
      });
      await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { draftStatus: DRAFT_STATUS.done },
        user,
        context: { [CTX.skipBuildQueue]: true },
      });
    } catch (error) {
      console.error('[agent-draft] run failed', error);
      events.push({ ts: Date.now(), phase: 'failed', detail: String((error as Error)?.message) });
      await payload.update({
        collection: COLLECTIONS.presentations,
        id: presentationId,
        data: { draftStatus: DRAFT_STATUS.failed, draftEvents: events },
        user,
        context: { [CTX.skipBuildQueue]: true },
      });
    }
  })();

  return NextResponse.json({ started: true });
}
