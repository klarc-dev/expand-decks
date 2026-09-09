'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  CheckboxInput,
  FieldPathContext,
  NumberField,
  TextareaInput,
  useDocumentInfo,
  useField,
} from '@payloadcms/ui';
import { MAX_SLIDES, MIN_SLIDES, slideCountRangeSchema } from '@/lib/draftConfig';

import { AdminNotice } from '@/components/adminUi/AdminSurface';
import {
  formatDraftEventDetail,
  formatDraftEventPhase,
  formatDraftEventTime,
} from '@/components/agentDraftJournal';
import { adminGet, adminPost } from '@/lib/adminFetch';
import { reconcileRunState } from '@/lib/runState';
import { COLLECTIONS } from '@/lib/collections';
import { sourcePolicyForSelection } from '@/lib/adminSourcePolicy';
import {
  getSourceReadinessLabel,
  groupSourceOptions,
  isSourceUnready,
  type BrowserSourceOption,
} from '@/lib/adminSourceOptions';

import './AgentDraftButton.scss';

type DraftEvent = { ts: number; phase: string; detail?: unknown };
type DraftMode = 'replace' | 'augment' | 'revise';
type SourceOption = BrowserSourceOption;

type DraftModeOption = {
  actionLabel: string;
  description: string;
  label: string;
  value: DraftMode;
};

const DRAFT_MODE_OPTIONS: ReadonlyArray<DraftModeOption> = [
  {
    value: 'revise',
    label: 'Réviser toute la présentation',
    actionLabel: 'Réviser toute la présentation',
    description: 'Reprend le deck actuel comme contexte, puis réécrit l’ensemble des slides.',
  },
  {
    value: 'replace',
    label: 'Recréer toute la présentation',
    actionLabel: 'Recréer toute la présentation',
    description:
      'Supprime les slides actuelles et génère un nouveau deck complet à partir du brief.',
  },
  {
    value: 'augment',
    label: 'Ajouter des slides à la fin',
    actionLabel: 'Ajouter des slides',
    description: 'Conserve toutes les slides actuelles et ajoute les nouvelles slides à la fin.',
  },
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

/** Empty bounds leave the workflow's automatic slide count unchanged. */
export function validateSlideCountRange(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (min == null && max == null) return { range: undefined, error: '' };
  const parsed = slideCountRangeSchema.safeParse({ min, max });
  if (parsed.success) return { range: parsed.data, error: '' };
  return {
    range: undefined,
    error: `Renseignez un minimum et un maximum entiers entre ${MIN_SLIDES} et ${MAX_SLIDES}, avec un minimum inférieur ou égal au maximum.`,
  };
}

function SlideCountInput({
  path,
  label,
  readOnly,
}: {
  path: string;
  label: string;
  readOnly: boolean;
}) {
  return (
    <FieldPathContext.Provider value={path}>
      <NumberField
        field={{
          name: path,
          label,
          min: MIN_SLIDES,
          max: MAX_SLIDES,
          admin: {
            autoComplete: 'off',
            className: 'agent-draft__count-input',
            step: 1,
            placeholder: 'Auto',
          },
        }}
        path={path}
        readOnly={readOnly}
      />
    </FieldPathContext.Provider>
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
            <span className="agent-draft__choice-copy">
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </span>
          </label>
        );
      })}
    </DraftFieldGroup>
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

function SourceControls({
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
  return (
    <DraftFieldGroup label="Sources">
      <a href={`/admin/collections/${COLLECTIONS.knowledgeBases}`}>
        Gérer les bases de connaissances
      </a>
      {sources.length === 0 && <span>Aucune source disponible. Le brief sera utilisé seul.</span>}
      <SourceOptionGroups
        sources={sources}
        renderSource={(source) => {
          const checked = selected.includes(source.id);
          const atCap = maxSources > 0 && selected.length >= maxSources;
          const unavailable = isSourceUnready(source);
          return (
            <div
              className="agent-draft__source-option"
              data-unready={unavailable || undefined}
              key={source.id}
            >
              <CheckboxInput
                checked={checked}
                className="agent-draft__checkbox"
                id={`agent-source-${source.id}`}
                label={source.label}
                name={`agent-source-${source.id}`}
                onToggle={() => onToggle(source.id)}
                readOnly={readOnly || unavailable || (!checked && atCap)}
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

type DurableRun = { status: string; suspended?: unknown; error?: string };
type PlanItem = { title: string; intent: string };

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

async function fetchDurableRun(runId: unknown): Promise<DurableRun | undefined> {
  if (typeof runId !== 'string' || !runId) return undefined;
  const { ok, data } = await adminGet(`/api/agent-draft/${encodeURIComponent(runId)}`);
  return ok && typeof data.status === 'string' ? data : undefined;
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
        const reached = stepIndex >= 0 && index <= stepIndex;
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
  status: string;
};

function AgentJournal({ events, status }: AgentJournalProps) {
  if (events.length === 0) return null;

  return (
    <details className="agent-draft__journal">
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
  canApprove: boolean;
  pending: boolean;
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
  startLabel: string;
};

function DraftRunActions({
  canApprove,
  pending,
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
  startLabel,
}: DraftRunActionsProps) {
  return (
    <fieldset className="agent-draft__actions">
      <legend className="sr-only">Actions du build agentique</legend>
      {!['suspended', 'stale', 'waiting'].includes(durableStatus) && (
        <Button
          buttonStyle="primary"
          disabled={!canStart}
          margin={false}
          onClick={onStart}
          size="medium"
          type="button"
        >
          {running || pending ? 'Génération…' : startLabel}
        </Button>
      )}
      {(running || ['suspended', 'waiting', 'stale'].includes(durableStatus)) && hasRun && (
        <Button
          buttonStyle="secondary"
          margin={false}
          disabled={pending}
          onClick={onCancel}
          size="small"
          type="button"
        >
          Annuler
        </Button>
      )}
      {!running && durableStatus === 'stale' && hasRun && (
        <Button
          buttonStyle="primary"
          margin={false}
          disabled={pending}
          onClick={onRestart}
          size="small"
          type="button"
        >
          Redémarrer le worker
        </Button>
      )}
      {!running && durableStatus === 'suspended' && hasRun && (
        <>
          <Button
            buttonStyle="primary"
            margin={false}
            disabled={pending || !canApprove}
            onClick={() => onResume(true)}
            size="small"
            type="button"
          >
            Approuver le plan
          </Button>
          <Button
            buttonStyle="secondary"
            margin={false}
            disabled={pending}
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
// fallow-ignore-next-line complexity
const AgentDraftButton: React.FC = () => {
  const { setValue: setBriefValue, value: storedBrief } = useField<string>({
    path: 'agentBrief',
  });
  const brief = storedBrief ?? '';
  const { value: slideCountMin } = useField<number | null>({
    path: 'agentSlideCountMin',
    disableFormData: true,
  });
  const { value: slideCountMax } = useField<number | null>({
    path: 'agentSlideCountMax',
    disableFormData: true,
  });
  const { error: slideCountError } = validateSlideCountRange(slideCountMin, slideCountMax);
  const [mode, setMode] = useState<DraftMode>('revise');
  const selectedMode = DRAFT_MODE_OPTIONS.find((option) => option.value === mode)!;
  const [visual, setVisual] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [hasSlides, setHasSlides] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [pending, setPending] = useState(false);
  const [outline, setOutline] = useState<PlanItem[]>([]);
  const [runId, setRunId] = useState<string>('');
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [maxSources, setMaxSources] = useState<number>(0);
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

  const requestRef = useRef(0);
  const commandRef = useRef(false);
  // fallow-ignore-next-line complexity
  const poll = useCallback(async () => {
    if (!id || commandRef.current) return;
    const request = ++requestRef.current;
    try {
      const { ok, data: doc } = await adminGet(`/api/presentations/${id}?depth=0`);
      if (!ok) throw new Error('Impossible de charger la génération. Rechargez cet onglet.');
      const run = await fetchDurableRun(doc.draftRunId);
      if (request !== requestRef.current) return;
      const durable = run?.status;
      const mirror = doc.draftStatus ?? 'idle';
      const state = reconcileRunState(mirror, durable);
      setHasSlides(Array.isArray(doc.slides) && doc.slides.length > 0);
      setRunId(typeof doc.draftRunId === 'string' ? doc.draftRunId : '');
      setDurableStatus(durable ?? '');
      setOutline(approvalOutline(run?.suspended));
      setEvents(Array.isArray(doc.draftEvents) ? doc.draftEvents : []);
      setStatus(state === 'done' || state === 'failed' ? state : mirror);
      const active =
        durable === 'queued' || durable === 'running' || (!durable && ACTIVE_STATUSES.has(mirror));
      setRunning(active);
      if (durable === 'stale') setError('Le worker a été interrompu. Redémarrez la génération.');
      else if (durable === 'canceled') setError('');
      else if (state === 'failed')
        setError(
          run?.error || 'La génération a échoué. Consultez le journal de cette présentation.',
        );
      else setError('');
      if (state === 'done' && pollRef.current) router.refresh();
      if (!active) stopPolling();
      setInitializing(false);
    } catch (err) {
      if (request !== requestRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de vérifier la génération. Rechargez cet onglet.',
      );
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
    })().catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Impossible de charger les sources externes.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    startPolling();
    void poll();
    return () => {
      ++requestRef.current;
      stopPolling();
    };
  }, [poll, startPolling, stopPolling]);

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
    if (!brief.trim() || !id || commandRef.current) return;
    const { range: slideCountRange, error: rangeError } = validateSlideCountRange(
      slideCountMin,
      slideCountMax,
    );
    if (rangeError) return;
    commandRef.current = true;
    ++requestRef.current;
    setPending(true);
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
        mode: hasSlides ? mode : 'replace',
        visual,
        sourcePolicy: sourcePolicyForSelection(selectedSources),
        approvalRequired,
        ...(slideCountRange ? { slideCountRange } : {}),
      });
      if (!ok) {
        setError(data.error || `Erreur (HTTP ${httpStatus})`);
        setRunning(false);
        return;
      }
      setStatus('gathering');
      setDurableStatus('queued');
      if (typeof data.runId === 'string') setRunId(data.runId);
      setOutline([]);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
      setRunning(false);
    } finally {
      commandRef.current = false;
      setPending(false);
    }
  }, [
    hasSlides,
    approvalRequired,
    brief,
    id,
    mode,
    selectedSources,
    visual,
    startPolling,
    slideCountMin,
    slideCountMax,
  ]);

  const handleRunAction = useCallback(
    async (action: 'cancel' | 'restart' | 'resume', approved?: boolean) => {
      if (!runId || commandRef.current) return;
      commandRef.current = true;
      ++requestRef.current;
      setPending(true);
      setError('');
      try {
        const { ok, data } = await adminPost(`/api/agent-draft/${encodeURIComponent(runId)}`, {
          action,
          ...(action === 'resume' ? { approved } : {}),
        });
        if (!ok) throw new Error(data.error || 'Action impossible. Réessayez.');
        if (action === 'cancel') {
          stopPolling();
          setRunning(false);
          setStatus('failed');
          setDurableStatus('canceled');
        } else {
          setStatus('gathering');
          setDurableStatus('queued');
          setRunning(true);
          setOutline([]);
          startPolling();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.');
      } finally {
        commandRef.current = false;
        setPending(false);
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
    durableStatus === 'canceled'
      ? formatDraftEventPhase('cancelled')
      : status === 'done'
        ? formatDraftEventPhase('done')
        : status === 'failed'
          ? formatDraftEventPhase('failed')
          : durableStatus === 'queued'
            ? formatDraftEventPhase('queued')
            : durableStatus === 'suspended'
              ? 'Plan en attente de validation.'
              : last
                ? formatDraftEventPhase(last.phase)
                : '';
  const statusEvent = getStatusEvent({ durableStatus, event: last, status });

  return (
    <div className="agent-draft__panel">
      <TextareaInput
        className="agent-draft__brief"
        description="Décrivez le public, l’objectif et les points à traiter. La génération prend plusieurs minutes."
        label="Brief de la présentation"
        path="agentBrief"
        value={brief}
        onChange={(e) => setBriefValue(e.target.value)}
        placeholder="Ex : Webinaire de 45 min pour juristes d'entreprise sur comment rendre une présentation d'expert réellement intéressante…"
        readOnly={running || pending || initializing}
        rows={5}
      />

      <DraftFieldGroup label="Nombre de slides (facultatif)">
        <SlideCountInput
          label="Minimum"
          path="agentSlideCountMin"
          readOnly={running || pending || initializing}
        />
        <SlideCountInput
          label="Maximum"
          path="agentSlideCountMax"
          readOnly={running || pending || initializing}
        />
        <p className="agent-draft__option-help">
          Laissez les deux champs vides pour un nombre automatique ; en révision, le nombre actuel
          est conservé par défaut. Couverture et conclusion incluses. En mode ajout, la fourchette
          concerne uniquement les nouvelles slides.
        </p>
        {slideCountError && <AdminNotice variant="error">{slideCountError}</AdminNotice>}
      </DraftFieldGroup>

      <SourceControls
        maxSources={maxSources}
        onToggle={toggleSource}
        readOnly={running || pending || initializing}
        selected={selectedSources}
        sources={sources}
      />

      {hasSlides && (
        <DraftModeSelector
          readOnly={running || pending || initializing}
          value={mode}
          onChange={setMode}
        />
      )}
      <details className="agent-draft__advanced">
        <summary>Options avancées</summary>
        <DraftFieldGroup label="Options du build">
          <CheckboxInput
            checked={visual}
            className="agent-draft__checkbox"
            id="agent-visual-review"
            label="Critique visuelle IA (plus lent, meilleur rendu)"
            name="agent-visual-review"
            onToggle={(event) => setVisual(event.target.checked)}
            readOnly={running || pending || initializing}
          />
          <p className="agent-draft__option-help">
            Les débordements sont toujours contrôlés avant publication. Cette option ajoute une
            critique IA de l’équilibre et de la lisibilité.
          </p>
          <CheckboxInput
            checked={approvalRequired}
            className="agent-draft__checkbox"
            id="agent-plan-approval"
            label="Valider le plan avant rédaction"
            name="agent-plan-approval"
            onToggle={(event) => setApprovalRequired(event.target.checked)}
            readOnly={running || pending || initializing}
          />
        </DraftFieldGroup>
      </details>
      {durableStatus === 'suspended' && (
        <section className="agent-draft__plan" aria-label="Plan proposé">
          <h3>Plan proposé</h3>
          {outline.length > 0 ? (
            <ol>
              {outline.map((item, index) => (
                <li key={`${index}:${item.title}`}>
                  <strong>{item.title}</strong>
                  <p>{item.intent}</p>
                </li>
              ))}
            </ol>
          ) : (
            <AdminNotice variant="hint">
              Le plan n’est pas disponible dans ce run. Vous pouvez refuser ou annuler la
              génération, mais pas approuver un plan non consultable.
            </AdminNotice>
          )}
        </section>
      )}

      <DraftRunActions
        canApprove={outline.length > 0}
        pending={pending}
        canStart={
          !running && !pending && !initializing && !slideCountError && Boolean(brief.trim())
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
        startLabel={selectedMode.actionLabel}
      />

      {running && <DraftProgress running={running} status={status} />}

      <AgentJournal events={events} status={status} />

      {error && (
        <AdminNotice className="agent-draft__error" variant="error">
          {error}
        </AdminNotice>
      )}
    </div>
  );
};

// fallow-ignore-next-line unused-export
export default AgentDraftButton;
