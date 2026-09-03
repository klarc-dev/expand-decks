import { randomBytes, randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

import { userIsOrganisationMember } from '@/access/roles';
import { AGENT_DRAFT_TASK } from '@/jobs/agentDraft';
import { agentRunFingerprint } from '@/jobs/agentRunLifecycle';
import { agentDraftStartSchema } from '@/lib/agentDraftContract';
import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { legacySourcePolicy } from '@/lib/sources/policy';
import { resolveSourcePolicy } from '@/lib/sources/resolve';
import { SourcePolicyError, TooManySourcesError, UnknownSourceError } from '@/lib/sources/types';
import { DRAFT_STATUS } from '@/lib/status';

const ACTIVE = ['queued', 'running', 'suspended', 'waiting'] as const;

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = agentDraftStartSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Requête invalide', issues: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }
  const { presentationId, brief, mode, visual, approvalRequired } = parsed.data;
  let sourceIds: string[];
  let sourcePolicy: 'none' | 'exclusive' | 'multiple';
  try {
    const requestedPolicy = parsed.data.sourcePolicy ?? legacySourcePolicy(parsed.data.sourceIds);
    const resolved = resolveSourcePolicy(requestedPolicy);
    sourcePolicy = resolved.policy.mode;
    sourceIds = resolved.sources.map((source) => source.id);
  } catch (error) {
    if (error instanceof UnknownSourceError) {
      return NextResponse.json(
        { error: `Unknown source id(s): ${error.unknownIds.join(', ')}` },
        { status: 400 },
      );
    }
    if (error instanceof SourcePolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TooManySourcesError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    user,
    disableErrors: true,
  });
  if (!presentation)
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  if (!userIsOrganisationMember(user, presentation.organisation)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  const existing = await payload.find({
    collection: COLLECTIONS.agentRuns,
    where: {
      and: [{ presentation: { equals: presentationId } }, { status: { in: [...ACTIVE] } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    return NextResponse.json({ error: 'Un build agentique est déjà en cours' }, { status: 409 });
  }

  const runId = randomUUID();
  const requestId = req.headers.get('x-request-id')?.slice(0, 128) || randomUUID();
  const traceId = randomBytes(16).toString('hex');
  const organisationId =
    typeof presentation.organisation === 'object'
      ? presentation.organisation?.id
      : presentation.organisation;
  const event = { ts: Date.now(), phase: 'queued' };
  const run = await payload.create({
    collection: COLLECTIONS.agentRuns,
    data: {
      presentation: Number(presentationId),
      createdBy: user.id,
      organisation: organisationId ?? undefined,
      mastraRunId: runId,
      requestId,
      traceId,
      status: 'queued',
      phase: 'gather',
      command: 'start',
      mode,
      brief,
      language: presentation.language,
      visual,
      approvalRequired,
      sourcePolicy,
      sourceIds,
      inputFingerprint: agentRunFingerprint({
        presentationId: String(presentationId),
        brief,
        mode,
        visual,
        sourcePolicy,
        sourceIds,
        approvalRequired,
      }),
      events: [event],
    },
    user,
  });
  await payload.update({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    data: {
      latestAgentRun: run.id,
      agentBrief: brief,
      draftRunId: runId,
      draftRequestId: requestId,
      draftTraceId: traceId,
      draftStatus: DRAFT_STATUS.gathering,
      draftSources: sourceIds,
      draftEvidence: [],
      draftEvents: [event],
    },
    user,
    context: { [CTX.skipBuildQueue]: true },
  });

  try {
    const job = await payload.jobs.queue({
      task: AGENT_DRAFT_TASK,
      input: { agentRunId: String(run.id), presentationId: String(presentationId) },
    });
    await payload.update({
      collection: COLLECTIONS.agentRuns,
      id: run.id,
      data: { payloadJobId: String(job.id) },
      overrideAccess: true,
    });
  } catch (error) {
    await payload.update({
      collection: COLLECTIONS.agentRuns,
      id: run.id,
      data: {
        status: 'failed',
        errorCode: 'queue-failed',
        errorSummary: String(error).slice(0, 2_000),
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: {
        draftStatus: DRAFT_STATUS.failed,
        draftEvents: [event, { ts: Date.now(), phase: 'failed', detail: 'Queue failed' }],
      },
      user,
      context: { [CTX.skipBuildQueue]: true },
    });
    throw error;
  }

  return NextResponse.json({ started: true, runId, requestId, status: 'queued' }, { status: 202 });
}
