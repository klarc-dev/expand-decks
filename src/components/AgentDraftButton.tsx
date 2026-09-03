'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  CheckboxInput,
  TextareaInput,
  toast,
  useDocumentInfo,
  useField,
} from '@payloadcms/ui';

import { AdminNotice, AdminPanel } from '@/components/adminUi/AdminSurface';
import {
  formatDraftEventDetail,
  formatDraftEventPhase,
  formatDraftEventTime,
} from '@/components/agentDraftJournal';
import { adminGet, adminPost } from '@/lib/adminFetch';
import { reconcileRunState } from '@/lib/runState';
import { canStartWithSourcePolicy, sourceIdsForPolicy } from '@/lib/adminSourcePolicy';
import {
  getSourceReadinessLabel,
  groupSourceOptions,
  isSourceUnready,
  type BrowserSourceOption,
} from '@/lib/adminSourceOptions';
import type { SourcePolicyMode } from '@/lib/sources/types';

import './AgentDraftButton.scss';

type DraftEvent = { ts: number; phase: string; detail?: unknown };
type DraftMode = 'replace' | 'augment' | 'revise';
type SourceOption = BrowserSourceOption;

const DRAFT_MODE_OPTIONS: ReadonlyArray<{ label: string; value: DraftMode }> = [
  { value: 'revise', label: 'Réviser les diapositives existantes' },
  { value: 'replace', label: 'Remplacer les diapositives' },
  { value: 'augment', label: 'Ajouter aux diapositives existantes' },
];

const JOURNAL_STATUS_LABEL: Record<string, string> = {
  idle: 'en attente',
  gathering: 'recherche',
  structuring: 'planification',
  drafting: 'rédaction',
  validating: 'validation',
  building: 'rendu',
  done: 'terminé',
  failed: 'échec',
};

const ACTIVE_STATUSES = new Set(['gathering', 'structuring', 'drafting', 'validating', 'building']);

type DraftFieldGroupProps = {
  children: React.ReactNode;
  label: React.ReactNode;
};

function DraftFieldGroup({ children, label }: DraftFieldGroupProps) {
  return (
    <fieldset className="agent-draft__field-group">
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}

type DraftModeSelectorProps = {
  readOnly: boolean;
  value: DraftMode;
  onChange: (value: DraftMode) => void;
};

function DraftModeSelector({ readOnly, value, onChange }: DraftModeSelectorProps) {
  return (
    <DraftFieldGroup label="Mode de génération">
      {DRAFT_MODE_OPTIONS.map((option) => {
        const id = `agent-mode-${option.value}`;
        return (
          <label className="agent-draft__choice" htmlFor={id} key={option.value}>
            <input
              checked={value === option.value}
              disabled={readOnly}
              id={id}
              name="agent-mode"
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        );
      })}
    </DraftFieldGroup>
  );
}

type SourcePolicySelectorProps = {
  readOnly: boolean;
  sourcesAvailable: boolean;
  value: SourcePolicyMode;
  maxSources: number;
  onChange: (value: SourcePolicyMode) => void;
};

function SourcePolicySelector({
  readOnly,
  sourcesAvailable,
  value,
  maxSources,
  onChange,
}: SourcePolicySelectorProps) {
  const options: ReadonlyArray<{ label: string; value: SourcePolicyMode }> = [
    { value: 'none', label: 'Aucune source externe' },
    { value: 'exclusive', label: 'Une source exclusive' },
    {
      value: 'multiple',
      label: `Plusieurs sources${maxSources > 0 ? ` (max ${maxSources})` : ''}`,
    },
  ];
  return (
    <DraftFieldGroup label="Politique des sources externes">
      {options.map((option) => (
        <label
          className="agent-draft__choice"
          htmlFor={`agent-source-policy-${option.value}`}
          key={option.value}
        >
          <input
            checked={value === option.value}
            disabled={readOnly || (option.value !== 'none' && !sourcesAvailable)}
            id={`agent-source-policy-${option.value}`}
            name="agent-source-policy"
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </DraftFieldGroup>
  );
}

function SourceChoiceLabel({ source }: { source: SourceOption }) {
  const readiness = getSourceReadinessLabel(source);
  return (
    <span className="agent-draft__source-label">
      <span>{source.label}</span>
      {readiness && (
        <span className="agent-draft__source-readiness" role="status">
          {readiness}
        </span>
      )}
    </span>
  );
}

function SourceOptionGroups({
  sources,
  renderSource,
}: {
  sources: SourceOption[];
  renderSource: (source: SourceOption) => React.ReactNode;
}) {
  return groupSourceOptions(sources).map((group) => (
    <div className="agent-draft__source-group" data-kind={group.kind} key={group.kind}>
      <div className="agent-draft__source-group-label">{group.label}</div>
      {group.sources.map(renderSource)}
    </div>
  ));
}

function ExclusiveSourceSelector({
  readOnly,
  selected,
  sources,
  onChange,
}: {
  readOnly: boolean;
  selected: string[];
  sources: SourceOption[];
  onChange: (id: string) => void;
}) {
  return (
    <DraftFieldGroup label="Source exclusive">
      <SourceOptionGroups
        sources={sources}
        renderSource={(source) => (
          <label
            className="agent-draft__choice"
            data-unready={isSourceUnready(source) || undefined}
            htmlFor={`agent-source-${source.id}`}
            key={source.id}
          >
            <input
              checked={selected.includes(source.id)}
              disabled={readOnly}
              id={`agent-source-${source.id}`}
              name="agent-exclusive-source"
              onChange={() => onChange(source.id)}
              type="radio"
            />
            <SourceChoiceLabel source={source} />
          </label>
        )}
      />
    </DraftFieldGroup>
  );
}

function MultipleSourceSelector({
  maxSources,
  readOnly,
  selected,
  sources,
  onToggle,
}: {
  maxSources: number;
  readOnly: boolean;
  selected: string[];
  sources: SourceOption[];
  onToggle: (id: string) => void;
}) {
  if (sources.length === 0) return null;
  return (
    <DraftFieldGroup label={`Sources${maxSources > 0 ? ` (max ${maxSources})` : ''}`}>
      <SourceOptionGroups
        sources={sources}
        renderSource={(source) => {
          const checked = selected.includes(source.id);
          const atCap = maxSources > 0 && selected.length >= maxSources;
          return (
            <div
              className="agent-draft__source-option"
              data-unready={isSourceUnready(source) || undefined}
              key={source.id}
            >
              <CheckboxInput
                checked={checked}
                className="agent-draft__checkbox"
                id={`agent-source-${source.id}`}
                label={source.label}
                name={`agent-source-${source.id}`}
                onToggle={() => onToggle(source.id)}
                readOnly={readOnly || (!checked && atCap)}
              />
              {getSourceReadinessLabel(source) && (
                <span className="agent-draft__source-readiness" role="status">
                  {getSourceReadinessLabel(source)}
                </span>
              )}
            </div>
          );
        }}
      />
    </DraftFieldGroup>
  );
}

function SourceControls({
  loaded,
  maxSources,
  policy,
  readOnly,
  selected,
  sources,
  onPolicyChange,
  onExclusiveChange,
  onMultipleToggle,
}: {
  loaded: boolean;
  maxSources: number;
  policy: SourcePolicyMode;
  readOnly: boolean;
  selected: string[];
  sources: SourceOption[];
  onPolicyChange: (value: SourcePolicyMode) => void;
  onExclusiveChange: (id: string) => void;
  onMultipleToggle: (id: string) => void;
}) {
  return (
    <>
      {loaded && (
        <SourcePolicySelector
          maxSources={maxSources}
          onChange={onPolicyChange}
          readOnly={readOnly}
          sourcesAvailable={sources.length > 0}
          value={policy}
        />
      )}
      {policy === 'exclusive' && (
        <ExclusiveSourceSelector
          onChange={onExclusiveChange}
          readOnly={readOnly}
          selected={selected}
          sources={sources}
        />
      )}
      {policy === 'multiple' && (
        <MultipleSourceSelector
          maxSources={maxSources}
          onToggle={onMultipleToggle}
          readOnly={readOnly}
          selected={selected}
          sources={sources}
        />
      )}
      {policy === 'exclusive' && selected.length !== 1 && (
        <AdminNotice variant="hint">Sélectionnez exactement une source exclusive.</AdminNotice>
      )}
    </>
  );
}

/** Query the durable Mastra run status; undefined when no handle/unreachable. */
async function fetchDurableStatus(runId: unknown): Promise<string | undefined> {
  if (typeof runId !== 'string' || !runId) return undefined;
  try {
    const res = await fetch(`/api/agent-draft/${encodeURIComponent(runId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return undefined;
    const body = await res.json();
    return typeof body.status === 'string' ? body.status : undefined;
  } catch {
    return undefined;
  }
}

// Pipeline steps shown as a progress rail; each draftStatus maps to an index.
const STEPS: { key: string; label: string }[] = [
  { key: 'gathering', label: 'Recherche' },
  { key: 'structuring', label: 'Plan' },
  { key: 'drafting', label: 'Rédaction' },
  { key: 'validating', label: 'Critique' },
  { key: 'building', label: 'Rendu visuel' },
];

type DraftProgressProps = {
  running: boolean;
  status: string;
};

function DraftProgress({ running, status }: DraftProgressProps) {
  const stepIndex = STEPS.findIndex((step) => step.key === status);

  return (
    <ol aria-label="Progression du build agentique" className="agent-draft__progress">
      {STEPS.map((step, index) => {
        const reached = status === 'done' || (stepIndex >= 0 && index <= stepIndex);
        const current = running && index === stepIndex;
        return (
          <li
            aria-current={current ? 'step' : undefined}
            className="agent-draft__progress-step"
            data-reached={reached || undefined}
            key={step.key}
          >
            <span className="agent-draft__progress-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

type AgentJournalProps = {
  events: DraftEvent[];
  initiallyOpen: boolean;
  status: string;
};

function AgentJournal({ events, initiallyOpen, status }: AgentJournalProps) {
  const [expanded, setExpanded] = useState(initiallyOpen);
  if (events.length === 0) return null;

  return (
    <details
      className="agent-draft__journal"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary className="agent-draft__journal-summary">
        Journal de l&apos;agent — {JOURNAL_STATUS_LABEL[status] ?? 'état inconnu'}
      </summary>
      <ol aria-label="Événements du build agentique" className="agent-draft__event-list">
        {events.map((event) => {
          const detail = formatDraftEventDetail(event);
          const time = formatDraftEventTime(event.ts);
          return (
            <li key={`${event.ts}:${event.phase}`}>
              {time && (
                <time className="agent-draft__event-time" dateTime={time.dateTime}>
                  {time.label}
                </time>
              )}
              {formatDraftEventPhase(event.phase)}
              {detail ? ` — ${detail}` : ''}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

type DraftRunStatusProps = {
  event: DraftEvent | undefined;
  phase: string;
  running: boolean;
};

function DraftRunStatus({ event, phase, running }: DraftRunStatusProps) {
  const detail = event ? formatDraftEventDetail(event) : null;
  const message = [phase, detail].filter(Boolean).join(' — ');

  return (
    <span
      aria-atomic="true"
      aria-live="polite"
      className="agent-draft__run-status"
      data-running={running || undefined}
      role="status"
    >
      {message ? (
        <>
          <span className="sr-only">Build agentique : </span>
          {message}
        </>
      ) : null}
    </span>
  );
}

type StatusEventInput = {
  durableStatus: string;
  event: DraftEvent | undefined;
  status: string;
};

function getStatusEvent({ durableStatus, event, status }: StatusEventInput) {
  if (status === 'done') return event?.phase === 'done' ? event : undefined;
  if (status === 'failed') return event?.phase === 'failed' ? event : undefined;
  if (durableStatus === 'canceled') return event?.phase === 'cancelled' ? event : undefined;
  if (durableStatus === 'queued') return undefined;
  return event;
}

type DraftRunActionsProps = {
  approvalRequired: boolean;
  canStart: boolean;
  durableStatus: string;
  event: DraftEvent | undefined;
  hasRun: boolean;
  phase: string;
  running: boolean;
  onCancel: () => void;
  onRestart: () => void;
  onResume: (approved: boolean) => void;
  onStart: () => void;
};

function DraftRunActions({
  approvalRequired,
  canStart,
  durableStatus,
  event,
  hasRun,
  onCancel,
  onRestart,
  onResume,
  onStart,
  phase,
  running,
}: DraftRunActionsProps) {
  return (
    <fieldset className="agent-draft__actions">
      <legend className="sr-only">Actions du build agentique</legend>
      <Button
        buttonStyle="primary"
        disabled={!canStart}
        margin={false}
        onClick={onStart}
        size="medium"
        type="button"
      >
        {running ? 'Agent en cours…' : 'Lancer le build agentique'}
      </Button>
      {running && hasRun && (
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={onCancel}
          size="small"
          type="button"
        >
          Annuler
        </Button>
      )}
      {!running && durableStatus === 'stale' && hasRun && (
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={onRestart}
          size="small"
          type="button"
        >
          Redémarrer le worker
        </Button>
      )}
      {!running && durableStatus === 'suspended' && hasRun && approvalRequired && (
        <>
          <Button
            buttonStyle="primary"
            margin={false}
            onClick={() => onResume(true)}
            size="small"
            type="button"
          >
            Approuver le plan
          </Button>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => onResume(false)}
            size="small"
            type="button"
          >
            Refuser
          </Button>
        </>
      )}
      <DraftRunStatus event={event} phase={phase} running={running} />
    </fieldset>
  );
}

/**
 * Dedicated "IA" tab panel for the agentic builder. Starts the long multi-agent
 * run (gather → structure → write → critique → build → visual-critique →
 * persist) and polls the document's draftStatus/draftEvents to stream live
 * progress. Survives reloads (state lives on the doc, not in the request):
 * on mount it reads the doc and resumes polling if a run is already active.
 */
const AgentDraftButton: React.FC = () => {
  const { setValue: setBriefValue, value: storedBrief } = useField<string>({ path: 'agentBrief' });
  const brief = storedBrief ?? '';
  const [mode, setMode] = useState<DraftMode>('replace');
  const [visual, setVisual] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [runId, setRunId] = useState<string>('');
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourcePolicy, setSourcePolicy] = useState<SourcePolicyMode>('none');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [maxSources, setMaxSources] = useState<number>(0);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>('idle');
  const [durableStatus, setDurableStatus] = useState<string>('');
  const [events, setEvents] = useState<DraftEvent[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  const { id } = useDocumentInfo();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/presentations/${id}?depth=0`, { credentials: 'include' });
      if (!res.ok) return;
      const doc = await res.json();
      const mirror: string = doc.draftStatus ?? 'idle';
      setStatus(mirror);
      if (Array.isArray(doc.draftEvents)) setEvents(doc.draftEvents);
      if (typeof doc.draftRunId === 'string') setRunId(doc.draftRunId);

      // The presentation status is a cheap phase mirror; the AgentRuns ledger
      // remains authoritative for queued, suspended, stale, and terminal state.
      const durable = doc.draftRunId ? await fetchDurableStatus(doc.draftRunId) : undefined;
      if (durable) setDurableStatus(durable);
      if (durable === 'suspended' || durable === 'waiting') {
        stopPolling();
        setRunning(false);
        return;
      }
      if (durable === 'stale') {
        stopPolling();
        setRunning(false);
        setError('Le worker a été interrompu. Vous pouvez redémarrer ce run.');
        return;
      }
      const state = reconcileRunState(mirror, durable);

      if (state === 'done' || state === 'failed') {
        stopPolling();
        setRunning(false);
        if (state === 'done') {
          router.refresh();
          toast.success('Présentation générée par l’agent.');
        } else {
          setError('Le build agentique a échoué. Voir le journal.');
        }
      }
    } catch {
      /* transient; keep polling */
    }
  }, [id, router, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(poll, 2000);
  }, [poll, stopPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await adminGet('/api/agent-sources');
      if (cancelled) return;
      if (ok && Array.isArray(data.sources)) {
        setSources(data.sources);
        setMaxSources(
          typeof data.maxSelected === 'number' ? data.maxSelected : data.sources.length,
        );
        if (typeof data.error === 'string') setError(data.error);
      } else {
        setError(data.error || 'Impossible de charger les sources externes.');
      }
      setSourcesLoaded(true);
    })().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Impossible de charger les sources externes.');
      setSourcesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resume a run already in flight (e.g. the user reloaded or switched tabs):
  // the run state lives on the doc, so one fetch tells us whether to poll.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/presentations/${id}?depth=0`, { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const doc = await res.json();
        const mirror: string = doc.draftStatus ?? 'idle';
        if (cancelled) return;
        setStatus(mirror);
        if (Array.isArray(doc.draftEvents)) setEvents(doc.draftEvents);
        if (typeof doc.draftRunId === 'string') setRunId(doc.draftRunId);
        if (ACTIVE_STATUSES.has(mirror)) {
          // Resuming onto an active mirror: confirm the durable run is still
          // alive before re-polling — if it died while we were away, surface it.
          const durable = await fetchDurableStatus(doc.draftRunId);
          if (durable) setDurableStatus(durable);
          if (cancelled) return;
          if (durable === 'suspended' || durable === 'waiting') {
            setRunning(false);
            return;
          }
          if (durable === 'stale') {
            setRunning(false);
            setError('Le worker a été interrompu. Vous pouvez redémarrer ce run.');
            return;
          }
          if (reconcileRunState(mirror, durable) === 'failed') {
            setError('Le build agentique a échoué. Voir le journal.');
            return;
          }
          setRunning(true);
          startPolling();
        }
      } catch {
        /* non-fatal: the panel just starts idle */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, startPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const toggleSource = useCallback(
    (sourceId: string) => {
      setSelectedSources((current) => {
        if (current.includes(sourceId)) return current.filter((id) => id !== sourceId);
        if (maxSources > 0 && current.length >= maxSources) return current;
        return [...current, sourceId];
      });
    },
    [maxSources],
  );

  const handleStart = useCallback(async () => {
    if (!brief.trim() || !id) return;
    setRunning(true);
    setError('');
    setEvents([]);
    try {
      const {
        ok,
        status: httpStatus,
        data,
      } = await adminPost('/api/agent-draft', {
        presentationId: String(id),
        brief,
        mode,
        visual,
        sourcePolicy: {
          mode: sourcePolicy,
          sourceIds: sourceIdsForPolicy(sourcePolicy, selectedSources),
        },
        approvalRequired,
      });
      if (!ok) {
        setError(data.error || `Erreur (HTTP ${httpStatus})`);
        setRunning(false);
        return;
      }
      setStatus('gathering');
      setDurableStatus('queued');
      if (typeof data.runId === 'string') setRunId(data.runId);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
      setRunning(false);
    }
  }, [approvalRequired, brief, id, mode, selectedSources, sourcePolicy, visual, startPolling]);

  const handleRunAction = useCallback(
    async (action: 'cancel' | 'restart' | 'resume', approved?: boolean) => {
      if (!runId) return;
      const { ok, data } = await adminPost(`/api/agent-draft/${encodeURIComponent(runId)}`, {
        action,
        ...(action === 'resume' ? { approved } : {}),
      });
      if (!ok) {
        setError(data.error || 'Action impossible');
        return;
      }
      if (action === 'cancel') {
        stopPolling();
        setRunning(false);
        setStatus('failed');
        setDurableStatus('canceled');
      } else {
        setDurableStatus('queued');
        setRunning(true);
        startPolling();
      }
    },
    [runId, startPolling, stopPolling],
  );

  if (!id) {
    return (
      <AdminNotice className="agent-draft__save-notice" variant="hint">
        Enregistrez d&apos;abord la présentation pour lancer le build agentique.
      </AdminNotice>
    );
  }

  const last = events[events.length - 1];
  const phaseText =
    status === 'done'
      ? formatDraftEventPhase('done')
      : status === 'failed'
        ? formatDraftEventPhase('failed')
        : durableStatus === 'canceled'
          ? formatDraftEventPhase('cancelled')
          : durableStatus === 'queued'
            ? formatDraftEventPhase('queued')
            : durableStatus === 'suspended'
              ? 'Plan en attente de validation.'
              : last
                ? formatDraftEventPhase(last.phase)
                : '';
  const statusEvent = getStatusEvent({ durableStatus, event: last, status });

  return (
    <AdminPanel className="agent-draft__panel">
      <TextareaInput
        className="agent-draft__brief"
        description="L’agent recherche, structure, rédige, construit le deck réel, le critique visuellement, puis corrige. Comptez plusieurs minutes."
        label="Brief de la présentation"
        path="agentBrief"
        value={brief}
        onChange={(e) => setBriefValue(e.target.value)}
        placeholder="Ex : Webinaire de 45 min pour juristes d'entreprise sur comment rendre une présentation d'expert réellement intéressante…"
        readOnly={running}
        rows={5}
      />

      <DraftModeSelector readOnly={running} value={mode} onChange={setMode} />

      <DraftFieldGroup label="Options du build">
        <CheckboxInput
          checked={visual}
          className="agent-draft__checkbox"
          id="agent-visual-review"
          label="Critique visuelle (plus lent, meilleur rendu)"
          name="agent-visual-review"
          onToggle={(event) => setVisual(event.target.checked)}
          readOnly={running}
        />
        <CheckboxInput
          checked={approvalRequired}
          className="agent-draft__checkbox"
          id="agent-plan-approval"
          label="Valider le plan avant rédaction"
          name="agent-plan-approval"
          onToggle={(event) => setApprovalRequired(event.target.checked)}
          readOnly={running}
        />
      </DraftFieldGroup>

      <SourceControls
        loaded={sourcesLoaded}
        maxSources={maxSources}
        onExclusiveChange={(sourceId) => setSelectedSources([sourceId])}
        onMultipleToggle={toggleSource}
        onPolicyChange={(value) => {
          setSourcePolicy(value);
          setSelectedSources([]);
        }}
        policy={sourcePolicy}
        readOnly={running}
        selected={selectedSources}
        sources={sources}
      />

      <DraftRunActions
        approvalRequired={approvalRequired}
        canStart={
          !running &&
          Boolean(brief.trim()) &&
          canStartWithSourcePolicy(sourcePolicy, selectedSources)
        }
        durableStatus={durableStatus}
        event={statusEvent}
        hasRun={Boolean(runId)}
        onCancel={() => handleRunAction('cancel')}
        onRestart={() => handleRunAction('restart')}
        onResume={(approved) => handleRunAction('resume', approved)}
        onStart={handleStart}
        phase={phaseText}
        running={running}
      />

      {(running || status === 'done' || status === 'failed') && (
        <DraftProgress running={running} status={status} />
      )}

      <AgentJournal events={events} initiallyOpen={running} status={status} />

      {error && (
        <AdminNotice className="agent-draft__error" variant="error">
          {error}
        </AdminNotice>
      )}
    </AdminPanel>
  );
};

export default AgentDraftButton;
