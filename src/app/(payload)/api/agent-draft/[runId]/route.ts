import { NextResponse, type NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { mastra } from '@/agents/mastra';
import { COLLECTIONS } from '@/lib/collections';
import { ROLES } from '@/access/roles';

export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { runId } = await params;
  try {
    const run = await mastra.getWorkflow('deckWorkflow').getWorkflowRunById(runId);
    if (!run) return NextResponse.json({ runId, status: 'not-found' }, { status: 404 });

    // Authorize: the run's resourceId is its presentationId. Confirm the caller
    // owns (or admins) that presentation before leaking its processing status.
    // Fail closed — a run with no resourceId (e.g. a script-created run) is not
    // tied to an owner, so no authenticated user may read it.
    const presId = run.resourceId;
    if (!presId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const pres = await payload.findByID({
      collection: COLLECTIONS.presentations,
      id: presId,
      user,
      disableErrors: true,
    });
    const ownerId = typeof pres?.createdBy === 'object' ? pres?.createdBy?.id : pres?.createdBy;
    if (!pres || (user.role !== ROLES.admin && ownerId !== user.id)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.json({ runId, status: run.status });
  } catch {
    return NextResponse.json({ runId, status: 'not-found' }, { status: 404 });
  }
}
