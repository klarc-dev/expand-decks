import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

import { ROLES } from '@/access/roles';
import { mastra } from '@/agents/mastra';
import { agentDraftCommandSchema } from '@/lib/agentDraftContract';
import { AGENT_DRAFT_TASK } from '@/jobs/agentDraft';
import { AGENT_RUN_STALE_MS } from '@/jobs/agentRunLifecycle';
import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { DRAFT_STATUS } from '@/lib/status';
import type { AgentRun } from '@/payload-types';

function idOf(value: number | { id: number }): number {
  return typeof value === 'object' ? value.id : value;
}

async function authorize(req: NextRequest, runId: string) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return { response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const found = await payload.find({
    collection: COLLECTIONS.agentRuns,
    where: { mastraRunId: { equals: runId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const ledger = found.docs[0] as AgentRun | undefined;
  if (!ledger)
    return { response: NextResponse.json({ runId, status: 'not-found' }, { status: 404 }) };
  const presentationId = idOf(ledger.presentation);
  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    user,
    disableErrors: true,
    depth: 0,
  });
  const ownerId =
    typeof presentation?.createdBy === 'object'
      ? presentation.createdBy?.id
      : presentation?.createdBy;
  if (!presentation || (user.role !== ROLES.admin && ownerId !== user.id)) {
    return { response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }
  const workflow = mastra.getWorkflow('deckWorkflow');
  const stored = await workflow.getWorkflowRunById(runId, {
    fields: ['suspendedPaths', 'resumeLabels', 'error'],
  });
  return { payload, user, workflow, stored, ledger, presentation, presentationId };
}

async function queueCommand(
  auth: Exclude<Awaited<ReturnType<typeof authorize>>, { response: Response }>,
) {
  const job = await auth.payload.jobs.queue({
    task: AGENT_DRAFT_TASK,
    input: { agentRunId: String(auth.ledger.id), presentationId: String(auth.presentationId) },
  });
  await auth.payload.update({
    collection: COLLECTIONS.agentRuns,
    id: auth.ledger.id,
    data: { payloadJobId: String(job.id), status: 'queued', heartbeatAt: new Date().toISOString() },
    overrideAccess: true,
  });
  return job;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const auth = await authorize(req, runId);
  if ('response' in auth) return auth.response;
  const heartbeat = auth.ledger.heartbeatAt ? Date.parse(auth.ledger.heartbeatAt) : 0;
  const status =
    ['queued', 'running'].includes(auth.ledger.status) &&
    heartbeat > 0 &&
    Date.now() - heartbeat > AGENT_RUN_STALE_MS
      ? 'stale'
      : auth.ledger.status;
  return NextResponse.json({
    runId,
    status,
    phase: auth.ledger.phase,
    command: auth.ledger.command,
    events: Array.isArray(auth.ledger.events) ? auth.ledger.events : [],
    error: auth.ledger.errorSummary,
    suspended: auth.ledger.suspendPayload ?? auth.stored?.suspendedPaths ?? [],
    updatedAt: auth.ledger.updatedAt,
    heartbeatAt: auth.ledger.heartbeatAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const parsed = agentDraftCommandSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  const auth = await authorize(req, runId);
  if ('response' in auth) return auth.response;

  if (parsed.data.action === 'cancel') {
    const run = await auth.workflow.createRun({ runId, resourceId: String(auth.presentationId) });
    await run.cancel();
    if (auth.ledger.payloadJobId) {
      await auth.payload.jobs.cancelByID({ id: auth.ledger.payloadJobId, overrideAccess: true });
    }
    await auth.payload.update({
      collection: COLLECTIONS.agentRuns,
      id: auth.ledger.id,
      data: { status: 'canceled', completedAt: new Date().toISOString() },
      overrideAccess: true,
    });
    await auth.payload.update({
      collection: COLLECTIONS.presentations,
      id: auth.presentationId,
      data: {
        draftStatus: DRAFT_STATUS.failed,
        draftEvents: [
          ...((auth.presentation.draftEvents as unknown[]) ?? []).slice(-199),
          { ts: Date.now(), phase: 'cancelled' },
        ],
      },
      user: auth.user,
      context: { [CTX.skipBuildQueue]: true },
    });
    return NextResponse.json({ runId, status: 'canceled' });
  }

  if (parsed.data.action === 'restart') {
    const heartbeat = auth.ledger.heartbeatAt ? Date.parse(auth.ledger.heartbeatAt) : 0;
    const stale = Date.now() - heartbeat > AGENT_RUN_STALE_MS;
    if (!['running', 'queued', 'stale'].includes(auth.ledger.status) || !stale) {
      return NextResponse.json(
        { error: 'Seul un run actif devenu stale peut être redémarré' },
        { status: 409 },
      );
    }
    await auth.payload.update({
      collection: COLLECTIONS.agentRuns,
      id: auth.ledger.id,
      data: { command: 'restart', status: 'queued' },
      overrideAccess: true,
    });
    await queueCommand(auth);
    return NextResponse.json({ runId, status: 'queued', command: 'restart' }, { status: 202 });
  }

  if (parsed.data.action === 'resume') {
    if (auth.ledger.status !== 'suspended') {
      return NextResponse.json({ error: 'Ce run n’attend pas d’approbation' }, { status: 409 });
    }
    await auth.payload.update({
      collection: COLLECTIONS.agentRuns,
      id: auth.ledger.id,
      data: {
        command: 'resume',
        resumeDecision: { approved: parsed.data.approved },
        status: 'queued',
      },
      overrideAccess: true,
    });
    await queueCommand(auth);
    return NextResponse.json({ runId, status: 'queued', command: 'resume' }, { status: 202 });
  }

  if (auth.user.role !== ROLES.admin) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  if (!['failed', 'succeeded', 'canceled'].includes(auth.ledger.status)) {
    return NextResponse.json({ error: 'Le run doit être terminé' }, { status: 409 });
  }
  await auth.payload.update({
    collection: COLLECTIONS.agentRuns,
    id: auth.ledger.id,
    data: { command: 'timeTravel', targetStep: parsed.data.step, status: 'queued' },
    overrideAccess: true,
  });
  await queueCommand(auth);
  return NextResponse.json(
    { runId, status: 'queued', command: 'timeTravel', step: parsed.data.step },
    { status: 202 },
  );
}
