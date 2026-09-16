import { randomBytes, randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

import { userIsAdminOrAuthor, userIsOrganisationMember } from '@/access/roles';
import { AGENT_DRAFT_TASK } from '@/jobs/agentDraft';
import { resolveDocumentTemplate } from '@/documents/templates';
import { agentDraftStartSchema } from '@/lib/agentDraftContract';
import { DEFAULT_AGENT_MODEL, verifyAgentModel } from '@/lib/agentModel';
import { COLLECTIONS } from '@/lib/collections';
import { CTX } from '@/lib/context';
import { legacySourcePolicy } from '@/lib/sources/policy';
import { resolveSourcePolicy } from '@/lib/sources/resolve';
import { SourcePolicyError, TooManySourcesError, UnknownSourceError } from '@/lib/sources/types';
import { DRAFT_STATUS } from '@/lib/status';

const ACTIVE = ['queued', 'running', 'suspended', 'waiting'] as const;
const KNOWLEDGE_PREFIX = 'knowledge_';

/** `knowledge_<id>` source ids map back to the relationship stored on the presentation. */
function knowledgeBaseIds(sourceIds: readonly string[]): number[] {
  return sourceIds
    .filter((id) => id.startsWith(KNOWLEDGE_PREFIX))
    .map((id) => Number(id.slice(KNOWLEDGE_PREFIX.length)))
    .filter((id) => Number.isInteger(id));
}

// This route intentionally coordinates authentication, validation, and workflow startup at one boundary.
// fallow-ignore-next-line complexity
export async function POST(req: NextRequest) {
  // fallow-ignore-next-line code-duplication -- route auth shape is framework-local and intentionally explicit.
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const parsed = agentDraftStartSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Requête invalide',
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }
  const { presentationId, brief, mode, visual, approvalRequired, slideCountRange } = parsed.data;
  const model = parsed.data.model || DEFAULT_AGENT_MODEL;
  let sourceIds: string[];
  let sourcePolicy: 'none' | 'exclusive' | 'multiple';
  let notReady: string[] = [];
  try {
    const requestedPolicy = parsed.data.sourcePolicy ?? legacySourcePolicy(parsed.data.sourceIds);
    const resolved = await resolveSourcePolicy(requestedPolicy, {
      payload,
      user,
    });
    sourcePolicy = resolved.policy.mode;
    sourceIds = resolved.sources.map((source) => source.id);
    // A base whose documents are not indexed would make the run research
    // nothing: refuse before the ledger row exists, so no orphan `queued` run
    // blocks the next start with a 409.
    notReady = resolved.sources
      .filter((source) => source.transport === 'knowledge' && source.readiness !== 'ready')
      .map((source) => source.label);
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

  if (notReady.length > 0) {
    return NextResponse.json(
      {
        error: `Base(s) de connaissances pas encore indexée(s) : ${notReady.join(', ')}. Attendez la fin de l’indexation.`,
      },
      { status: 400 },
    );
  }

  const presentation = await payload.findByID({
    collection: COLLECTIONS.presentations,
    id: presentationId,
    user,
    disableErrors: true,
  });
  if (!presentation)
    return NextResponse.json({ error: 'Présentation introuvable' }, { status: 404 });
  // fallow-ignore-next-line code-duplication -- route auth shape is framework-local and intentionally explicit.
  if (!userIsOrganisationMember(user, presentation.organisation)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  if (!userIsAdminOrAuthor(user)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }
  try {
    const template = resolveDocumentTemplate(presentation.documentTemplate);
    if (
      slideCountRange &&
      (slideCountRange.min < template.agent.pageCount.min ||
        slideCountRange.max > template.agent.pageCount.max)
    ) {
      return NextResponse.json(
        {
          error: `Le template « ${template.id} » exige une cible entre ${template.agent.pageCount.min} et ${template.agent.pageCount.max} pages.`,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Template de document invalide' },
      { status: 422 },
    );
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

  // Probing the gateway costs an outbound LLM round-trip, so it runs only once
  // the caller is authorised for this presentation and no run is already active.
  if (model !== DEFAULT_AGENT_MODEL) {
    try {
      await verifyAgentModel(model);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Modèle indisponible' },
        { status: 422 },
      );
    }
  }

  const deckHasSlides = Array.isArray(presentation.slides) && presentation.slides.length > 0;
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
      model,
      brief,
      language: presentation.language,
      visual,
      approvalRequired,
      ...(slideCountRange ? { slideCountRange } : {}),
      sourcePolicy,
      sourceIds,
      events: [event],
    },
    user,
  });
  try {
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: {
        agentBrief: brief,
        agentSlideCountMin: slideCountRange?.min ?? null,
        agentSlideCountMax: slideCountRange?.max ?? null,
        agentKnowledgeBases: knowledgeBaseIds(sourceIds),
        // An empty deck always starts in 'replace'; persisting that coercion would
        // silently turn the author's stored mode destructive for the next run.
        ...(deckHasSlides ? { agentMode: mode } : {}),
        agentModel: model,
        agentVisualCritique: visual,
        agentApprovalRequired: approvalRequired,
        draftRunId: runId,
        draftStatus: DRAFT_STATUS.gathering,
      },
      overrideAccess: true,
      context: { [CTX.skipBuildQueue]: true },
    });
    const job = await payload.jobs.queue({
      task: AGENT_DRAFT_TASK,
      input: {
        agentRunId: String(run.id),
        presentationId: String(presentationId),
      },
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
        errorSummary: String(error).slice(0, 2_000),
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: COLLECTIONS.presentations,
      id: presentationId,
      data: { draftStatus: DRAFT_STATUS.failed },
      overrideAccess: true,
      context: { [CTX.skipBuildQueue]: true },
    });
    throw error;
  }

  return NextResponse.json({ started: true, runId, requestId, status: 'queued' }, { status: 202 });
}
