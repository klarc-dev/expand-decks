'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banner,
  Button,
  Collapsible,
  toast,
  useAllFormFields,
  useDocumentInfo,
} from '@payloadcms/ui';

import {
  formatDraftEventDetail,
  formatDraftEventPhase,
  formatDraftEventTime,
} from '@/components/agentDraftJournal';
import { adminGet, adminPost } from '@/lib/adminFetch';
import { sourcePolicyForSelection } from '@/lib/adminSourcePolicy';
import {
  MAX_SELECTED_SOURCES,
  MAX_SLIDES,
  MIN_BRIEF_CHARS,
  MIN_SLIDES,
  slideCountRangeSchema,
} from '@/lib/draftConfig';
import type { SlideCountRange } from '@/lib/draftConfig';

import './AgentRunControls.scss';

type RunEvent = { ts: number; phase: string; detail?: unknown };
type PlanItem = { intent: string; title: string };
type DurableRun = {
  error?: string;
  events?: RunEvent[];
  phase?: string;
  status: string;
  suspended?: unknown;
};

/** Pipeline steps of the durable run, shown as a progress rail. */
const STEPS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'gather', label: 'Recherche' },
  { key: 'structure', label: 'Plan' },
  { key: 'draft', label: 'Rédaction' },
  { key: 'validate', label: 'Critique' },
  { key: 'visual', label: 'Rendu visuel' },
  { key: 'assemble', label: 'Assemblage' },
];

const START_LABEL: Record<string, string> = {
  replace: 'Générer la présentation',
  revise: 'Réviser la présentation',
  augment: 'Ajouter des slides',
};

export function startLabelForMode(mode: unknown): string {
  return (typeof mode === 'string' && START_LABEL[mode]) || START_LABEL.replace!;
}

/** Mastra suspended paths are not a readable approval payload. */
export function approvalOutline(suspended: unknown): PlanItem[] {
  if (!suspended || typeof suspended !== 'object' || Array.isArray(suspended)) return [];
  const { outline } = suspended as Record<string, unknown>;
  if (!Array.isArray(outline) || !outline.length) return [];
  return outline.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.title === 'string' &&
      typeof item.intent === 'string',
  )
    ? outline
    : [];
}

/** Empty bounds leave the workflow's automatic slide count unchanged. */
export function slideCountRangeFromFields(
  min: unknown,
  max: unknown,
): { error?: string; range?: SlideCountRange } {
  const lower = typeof min === 'number' && Number.isFinite(min) ? min : undefined;
  const upper = typeof max === 'number' && Number.isFinite(max) ? max : undefined;
  if (lower === undefined && upper === undefined) return {};
  if (lower === undefined || upper === undefined)
    return { error: 'Renseignez les deux bornes ou aucune.' };
  if (lower > upper) return { error: 'Le maximum doit être supérieur ou égal au minimum.' };
  const parsed = slideCountRangeSchema.safeParse({ min: lower, max: upper });
  if (!parsed.success)
    return { error: `Renseignez des entiers entre ${MIN_SLIDES} et ${MAX_SLIDES}.` };
  return { range: parsed.data };
}

/** Knowledge bases travel through the workflow as registry ids. */
export function sourceIdsFromFields(knowledgeBases: unknown): string[] {
  return (Array.isArray(knowledgeBases) ? knowledgeBases : [])
    .map((entry) =>
      entry && typeof entry === 'object' ? (entry as { value?: unknown }).value : entry,
    )
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map((value) => `knowledge_${value}`);
}

/** Ledger phases with no rail step of their own. */
const PHASE_STEP: Record<string, string> = { approval: 'structure', persist: 'assemble' };

function ProgressRail({ phase }: { phase: string | undefined }) {
  const key = phase ? (PHASE_STEP[phase] ?? phase) : undefined;
  const index = STEPS.findIndex((step) => step.key === key);
  return (
    <ol aria-label="Progression de la génération" className="agent-run__progress">
      {STEPS.map((step, position) => (
        <li
          aria-current={position === index ? 'step' : undefined}
          data-reached={index >= 0 && position <= index ? true : undefined}
          key={step.key}
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
}

type FormFields = Record<string, { rows?: unknown[]; value?: unknown } | undefined>;

/** Everything the start request needs, read straight from the native fields. */
function runRequestFromFields(fields: FormFields) {
  const valueOf = (path: string): unknown => fields?.[path]?.value;
  const text = (path: string) => {
    const value = valueOf(path);
    return typeof value === 'string' ? value : '';
  };
  const slides = fields?.slides;
  const slideCount =
    slides?.rows?.length ?? (Array.isArray(slides?.value) ? slides.value.length : 0);
  const mode = text('agentMode');
  return {
    approvalRequired: valueOf('agentApprovalRequired') === true,
    brief: text('agentBrief'),
    draftRunId: text('draftRunId'),
    model: text('agentModel'),
    slideCount: slideCountRangeFromFields(
      valueOf('agentSlideCountMin'),
      valueOf('agentSlideCountMax'),
    ),
    sourceIds: sourceIdsFromFields(valueOf('agentKnowledgeBases')),
    startMode: slideCount > 0 && mode ? mode : 'replace',
    visual: valueOf('agentVisualCritique') !== false,
  };
}

/** Toast copy for a run that just reached a terminal status, if any. */
function terminalToast(status: string, error?: string): { error?: true; text: string } | null {
  if (status === 'succeeded') return { text: 'Génération terminée.' };
  if (status === 'canceled') return { error: true, text: error || 'Génération annulée.' };
  if (status === 'failed')
    return { error: true, text: error || 'La génération a échoué. Consultez le journal.' };
  return null;
}

/** The plan awaiting approval. */
function ApprovalBanner({ outline }: { outline: PlanItem[] }) {
  return (
    <Banner type="info">
      <ol className="agent-run__outline">
        {outline.map((item, index) => (
          <li key={`${index}:${item.title}`}>
            <strong>{item.title}</strong> — {item.intent}
          </li>
        ))}
      </ol>
    </Banner>
  );
}

type RunActionsProps = {
  active: boolean;
  awaitingApproval: boolean;
  canApprove: boolean;
  canStart: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onResume: (approved: boolean) => void;
  onStart: () => void;
  pending: boolean;
  retryable: boolean;
  startLabel: string;
};

function RunActions({
  active,
  awaitingApproval,
  canApprove,
  canStart,
  onCancel,
  onRetry,
  onResume,
  onStart,
  pending,
  retryable,
  startLabel,
}: RunActionsProps) {
  const action = { margin: false as const, type: 'button' as const };
  return (
    <div className="agent-run__actions">
      {retryable ? (
        <Button {...action} buttonStyle="primary" disabled={pending} onClick={onRetry}>
          Réessayer
        </Button>
      ) : !awaitingApproval ? (
        <Button {...action} buttonStyle="primary" disabled={!canStart} onClick={onStart}>
          {active || pending ? 'Génération…' : startLabel}
        </Button>
      ) : null}
      {awaitingApproval && canApprove && (
        <>
          <Button
            {...action}
            buttonStyle="primary"
            disabled={pending || !canApprove}
            onClick={() => onResume(true)}
          >
            Approuver
          </Button>
          <Button
            {...action}
            buttonStyle="secondary"
            disabled={pending}
            onClick={() => onResume(false)}
          >
            Refuser
          </Button>
        </>
      )}
      {(active || awaitingApproval) && (
        <Button
          {...action}
          buttonStyle="secondary"
          disabled={pending}
          onClick={onCancel}
          size="small"
        >
          Annuler
        </Button>
      )}
    </div>
  );
}

function RunJournal({ events }: { events: RunEvent[] }) {
  if (events.length === 0) return null;
  return (
    <Collapsible header="Journal de l’agent" initCollapsed>
      <ol aria-label="Événements de la génération" className="agent-run__journal">
        {events.map((event, index) => {
          const time = formatDraftEventTime(event.ts);
          const detail = formatDraftEventDetail(event);
          return (
            // Phases repeat within a millisecond, so the position completes the key.
            <li key={`${index}:${event.ts}:${event.phase}`}>
              {time && <time dateTime={time.dateTime}>{time.label}</time>}{' '}
              {formatDraftEventPhase(event.phase)}
              {detail ? ` — ${detail}` : ''}
            </li>
          );
        })}
      </ol>
    </Collapsible>
  );
}

type RunView = {
  active: boolean;
  awaitingApproval: boolean;
  events: RunEvent[];
  failed: boolean;
  outcome: { error?: true; text: string } | null;
  outline: PlanItem[];
  stale: boolean;
  status: string;
};

export function canRestartRun(status: string): boolean {
  return status === 'stale';
}

/** Everything the UI derives from the polled ledger record. */
function runView(run: DurableRun | null): RunView {
  const status = run?.status ?? '';
  return {
    active: status === 'queued' || status === 'running',
    // Only a suspended run accepts a resume; 'waiting' 409s on the command route.
    awaitingApproval: status === 'suspended',
    events: Array.isArray(run?.events) ? run.events : [],
    failed: status === 'failed',
    // Toasts only fire on a transition; a reload must still show why a run ended.
    outcome:
      status === 'failed' || status === 'canceled' || status === 'stale'
        ? terminalToast(
            status === 'stale' ? 'failed' : status,
            run?.error || (status === 'stale' ? 'Le worker a été interrompu.' : undefined),
          )
        : null,
    outline: approvalOutline(run?.suspended),
    stale: canRestartRun(status),
    status,
  };
}

function RunBanners({ error, view }: { error?: string; view: RunView }) {
  return (
    <>
      {error && <Banner type="error">{error}</Banner>}
      {view.outcome && (
        <Banner type={view.outcome.error ? 'error' : 'info'}>{view.outcome.text}</Banner>
      )}
      {view.awaitingApproval && view.outline.length > 0 ? (
        <ApprovalBanner outline={view.outline} />
      ) : null}
      {view.awaitingApproval && view.outline.length === 0 ? (
        <Banner type="error">Le plan de ce run est indisponible. Annulez la génération.</Banner>
      ) : null}
    </>
  );
}

/**
 * Run-controls widget of the "IA" tab. Every option lives in native Payload
 * fields on the document; this component only reads the current form values,
 * starts the durable run and polls `GET /api/agent-draft/<runId>` — the agent
 * run ledger is the single source of truth for progress, plan approval and
 * failures.
 */
const AgentRunControls: React.FC = () => {
  const [fields] = useAllFormFields();
  const { id } = useDocumentInfo();
  const router = useRouter();
  const [run, setRun] = useState<DurableRun | null>(null);
  const [startedRunId, setStartedRunId] = useState('');
  const [pending, setPending] = useState(false);
  const statusRef = useRef('');

  const request = runRequestFromFields(fields as FormFields);
  const { brief, startMode } = request;
  const { error: rangeError, range } = request.slideCount;
  const blockingError =
    rangeError ??
    (request.sourceIds.length > MAX_SELECTED_SOURCES
      ? `Sélectionnez au maximum ${MAX_SELECTED_SOURCES} bases de connaissances.`
      : undefined);
  const runId = startedRunId || request.draftRunId;

  const view = runView(run);
  const { active, awaitingApproval, events, outline } = view;

  const refresh = useCallback(
    async (currentRunId: string) => {
      const { ok, data } = await adminGet(`/api/agent-draft/${encodeURIComponent(currentRunId)}`);
      if (!ok || typeof data.status !== 'string') return;
      setRun(data as DurableRun);
      const previous = statusRef.current;
      statusRef.current = data.status;
      if (!previous || previous === data.status) return;
      const message = terminalToast(data.status, data.error);
      if (!message) return;
      if (message.error) toast.error(message.text);
      else {
        toast.success(message.text);
        router.refresh();
      }
    },
    [router],
  );

  useEffect(() => {
    if (!runId) return;
    void refresh(runId);
  }, [refresh, runId]);

  useEffect(() => {
    if (!runId || !active) return;
    const timer = setInterval(() => void refresh(runId), 2000);
    return () => clearInterval(timer);
  }, [active, refresh, runId]);

  async function start() {
    if (!id || pending) return;
    setPending(true);
    try {
      const {
        ok,
        data,
        status: httpStatus,
      } = await adminPost('/api/agent-draft', {
        presentationId: String(id),
        brief,
        mode: startMode,
        model: request.model || undefined,
        visual: request.visual,
        approvalRequired: request.approvalRequired,
        ...(range ? { slideCountRange: range } : {}),
        sourcePolicy: sourcePolicyForSelection(request.sourceIds),
      });
      if (!ok) {
        toast.error(data.error || `Erreur (HTTP ${httpStatus})`);
        return;
      }
      statusRef.current = 'queued';
      setRun({ status: 'queued', events: [] });
      if (typeof data.runId === 'string') setStartedRunId(data.runId);
      // The server just wrote the run pointers and froze the options; without a
      // refresh the open form still holds the pre-run values and a save would
      // clobber them.
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.');
    } finally {
      setPending(false);
    }
  }

  async function command(action: 'cancel' | 'restart' | 'resume', approved?: boolean) {
    if (!runId || pending) return;
    setPending(true);
    try {
      const { ok, data } = await adminPost(`/api/agent-draft/${encodeURIComponent(runId)}`, {
        action,
        ...(action === 'resume' ? { approved } : {}),
      });
      if (!ok) {
        toast.error(data.error || 'Action impossible. Réessayez.');
        return;
      }
      statusRef.current = action === 'cancel' ? 'canceled' : 'queued';
      await refresh(runId);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.');
    } finally {
      setPending(false);
    }
  }

  if (!id)
    return (
      <Banner type="info">
        Enregistrez d&apos;abord la présentation pour lancer la génération.
      </Banner>
    );

  return (
    <div className="agent-run">
      <RunBanners error={blockingError} view={view} />

      <RunActions
        active={active}
        awaitingApproval={awaitingApproval}
        canApprove={outline.length > 0}
        canStart={brief.trim().length >= MIN_BRIEF_CHARS && !blockingError && !active && !pending}
        onCancel={() => void command('cancel')}
        onRetry={() => void command('restart')}
        onResume={(approved) => void command('resume', approved)}
        onStart={() => void start()}
        pending={pending}
        retryable={view.stale}
        startLabel={startLabelForMode(startMode)}
      />

      {(active || awaitingApproval) && <ProgressRail phase={run?.phase} />}
      <RunJournal events={events} />
    </div>
  );
};

export default AgentRunControls;
