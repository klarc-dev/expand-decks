'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, useDocumentInfo } from '@payloadcms/ui';

import {
  dashedHintStyle,
  errorBoxStyle,
  mutedTextStyle,
  panelStyle,
  primaryButtonStyle,
} from '@/components/adminUi/styles';
import { adminPost } from '@/lib/adminFetch';
import { reconcileRunState } from '@/lib/runState';

type DraftEvent = { ts: number; phase: string; detail?: unknown };
type DraftMode = 'replace' | 'augment';

const PHASE_LABEL: Record<string, string> = {
  gather: 'Recherche du dossier…',
  structure: 'Plan des diapositives…',
  draft: 'Rédaction des diapositives…',
  validate: 'Critique du contenu…',
  'validate:revise': 'Correction des diapositives signalées…',
  'validate:pass': 'Contenu validé.',
  build: 'Build Slidev (rendu réel)…',
  visual: 'Critique visuelle des diapositives rendues…',
  'visual:revise': 'Correction des problèmes visuels…',
  done: 'Terminé.',
  failed: 'Échec.',
};

const ACTIVE_STATUSES = new Set(['gathering', 'structuring', 'drafting', 'validating', 'building']);

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

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  color: 'var(--theme-text)',
  cursor: 'pointer',
};

/**
 * Dedicated "IA" tab panel for the agentic builder. Starts the long multi-agent
 * run (gather → structure → write → critique → build → visual-critique →
 * persist) and polls the document's draftStatus/draftEvents to stream live
 * progress. Survives reloads (state lives on the doc, not in the request):
 * on mount it reads the doc and resumes polling if a run is already active.
 */
const AgentDraftButton: React.FC = () => {
  const [brief, setBrief] = useState('');
  const [mode, setMode] = useState<DraftMode>('replace');
  const [visual, setVisual] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>('idle');
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

      // The per-step mirror drives live progress, but a recycled/dead run can
      // freeze it on an ACTIVE phase forever. Only cross-check Mastra while the
      // mirror is active; terminal/idle states avoid a second request per poll.
      const durable = ACTIVE_STATUSES.has(mirror)
        ? await fetchDurableStatus(doc.draftRunId)
        : undefined;
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
        if (ACTIVE_STATUSES.has(mirror)) {
          // Resuming onto an active mirror: confirm the durable run is still
          // alive before re-polling — if it died while we were away, surface it.
          const durable = await fetchDurableStatus(doc.draftRunId);
          if (cancelled) return;
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
      });
      if (!ok) {
        setError(data.error || `Erreur (HTTP ${httpStatus})`);
        setRunning(false);
        return;
      }
      setStatus('gathering');
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
      setRunning(false);
    }
  }, [brief, id, mode, visual, startPolling]);

  if (!id) {
    return (
      <div style={dashedHintStyle}>
        Enregistrez d&apos;abord la présentation pour lancer le build agentique.
      </div>
    );
  }

  const last = events[events.length - 1];
  const phaseText = last ? (PHASE_LABEL[last.phase] ?? last.phase) : '';
  const stepIndex = STEPS.findIndex((s) => s.key === status);
  const draftProgress =
    last?.phase === 'draft' && last.detail && typeof last.detail === 'object'
      ? (last.detail as { completed?: number; total?: number })
      : null;

  return (
    <div style={{ ...panelStyle, padding: '20px' }}>
      <label
        htmlFor="agent-brief"
        style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}
      >
        Brief de la présentation
      </label>
      <p style={{ ...mutedTextStyle, marginBottom: '12px', marginTop: 0 }}>
        L&apos;agent recherche, structure, rédige, construit le deck réel, le critique visuellement,
        puis corrige. Comptez plusieurs minutes.
      </p>

      <textarea
        id="agent-brief"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Ex : Webinaire de 45 min pour juristes d'entreprise sur comment rendre une présentation d'expert réellement intéressante…"
        disabled={running}
        rows={5}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-elevation-0)',
          color: 'var(--theme-text)',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '20px',
          marginTop: '12px',
        }}
      >
        <label style={checkboxRowStyle}>
          <input
            type="radio"
            name="agent-mode"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
            disabled={running}
          />
          Remplacer les diapositives
        </label>
        <label style={checkboxRowStyle}>
          <input
            type="radio"
            name="agent-mode"
            checked={mode === 'augment'}
            onChange={() => setMode('augment')}
            disabled={running}
          />
          Ajouter aux diapositives existantes
        </label>
        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={visual}
            onChange={(e) => setVisual(e.target.checked)}
            disabled={running}
          />
          Critique visuelle (plus lent, meilleur rendu)
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={handleStart}
          disabled={running || !brief.trim()}
          style={{
            ...primaryButtonStyle(running),
            padding: '10px 20px',
            cursor: running || !brief.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {running ? 'Agent en cours…' : 'Lancer le build agentique'}
        </button>
        {running && (
          <span style={mutedTextStyle}>
            {phaseText || 'Démarrage…'}
            {draftProgress?.total
              ? ` (${draftProgress.completed ?? 0}/${draftProgress.total})`
              : ''}
          </span>
        )}
      </div>

      {(running || status === 'done' || status === 'failed') && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px' }}
          aria-hidden
        >
          {STEPS.map((step, i) => {
            const reached = status === 'done' || (stepIndex >= 0 && i <= stepIndex);
            const current = running && i === stepIndex;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && (
                  <span
                    style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: reached
                        ? 'var(--theme-success-500)'
                        : 'var(--theme-elevation-150)',
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: current ? 700 : 500,
                    color: reached ? 'var(--theme-text)' : 'var(--theme-elevation-400)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.label}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <details style={{ marginTop: '12px' }} open={running}>
          <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            Journal de l&apos;agent ({status})
          </summary>
          <ul
            style={{ ...mutedTextStyle, fontSize: '12px', paddingLeft: '18px', marginTop: '8px' }}
          >
            {events.map((e, i) => (
              <li key={i}>
                {PHASE_LABEL[e.phase] ?? e.phase}
                {e.detail ? ` — ${JSON.stringify(e.detail)}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <div style={errorBoxStyle}>{error}</div>}
    </div>
  );
};

export default AgentDraftButton;
