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

type DraftEvent = { ts: number; phase: string; detail?: unknown };

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

/**
 * Agentic builder trigger. Starts the long multi-agent run (gather → structure →
 * write → critique → build → visual-critique → persist) and polls the document's
 * draftStatus/draftEvents to stream live progress. Survives reloads (state lives
 * on the doc, not in the request).
 */
const AgentDraftButton: React.FC = () => {
  const [brief, setBrief] = useState('');
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
      const s: string = doc.draftStatus ?? 'idle';
      setStatus(s);
      if (Array.isArray(doc.draftEvents)) setEvents(doc.draftEvents);
      if (s === 'done' || s === 'failed') {
        stopPolling();
        setRunning(false);
        if (s === 'done') {
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
      });
      if (!ok) {
        setError(data.error || `Erreur (HTTP ${httpStatus})`);
        setRunning(false);
        return;
      }
      setStatus('gathering');
      stopPolling();
      pollRef.current = setInterval(poll, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
      setRunning(false);
    }
  }, [brief, id, poll, stopPolling]);

  if (!id) {
    return (
      <div style={dashedHintStyle}>
        Enregistrez d&apos;abord la présentation pour lancer le build agentique.
      </div>
    );
  }

  const last = events[events.length - 1];
  const phaseText = last ? (PHASE_LABEL[last.phase] ?? last.phase) : '';

  return (
    <div style={{ ...panelStyle, padding: '20px' }}>
      <label
        htmlFor="agent-brief"
        style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}
      >
        Build agentique (recherche → plan → rédaction → critique → rendu visuel)
      </label>
      <p style={{ ...mutedTextStyle, marginBottom: '12px', marginTop: 0 }}>
        L&apos;agent rédige, construit le deck réel, le critique visuellement, puis corrige — pour
        un deck d&apos;expert vraiment intéressant. Plus lent qu&apos;une génération simple
        (plusieurs minutes).
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
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
        {running && <span style={mutedTextStyle}>{phaseText || 'Démarrage…'}</span>}
      </div>

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
