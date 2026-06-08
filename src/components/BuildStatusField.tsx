'use client';

import React, { useEffect } from 'react';
import { useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { BUILD_STATUS, type BuildStatus } from '@/lib/status';

type BuildInfo = {
  lastBuildStatus?: BuildStatus | null;
  spaUrl?: string | null;
  lastBuildError?: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  [BUILD_STATUS.idle]: { label: 'En attente', color: 'var(--theme-elevation-600)', bg: 'var(--theme-elevation-100)' },
  [BUILD_STATUS.building]: { label: 'En cours…', color: '#8a6d00', bg: '#fff3bf' },
  [BUILD_STATUS.success]: { label: 'Réussi', color: '#0b6b3a', bg: '#d3f9d8' },
  [BUILD_STATUS.failed]: { label: 'Échoué', color: 'var(--theme-error-500)', bg: 'var(--theme-error-50)' },
};

// Poll fast while a build is in flight; stop entirely on a terminal state so an
// idle tab never holds a perpetual interval.
const BUILDING_POLL_MS = 2000;

/**
 * Live build status — uses Payload's native `usePayloadAPI` to read the document
 * (no hand-rolled fetch/state) and re-fetches on a short interval only while the
 * build is in progress, so authors see En attente → En cours → Réussi/Échoué.
 */
const BuildStatusField: React.FC = () => {
  const { id } = useDocumentInfo();
  const [{ data }, { setParams }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    initialParams: { depth: 0 },
  });

  const info = (data ?? null) as BuildInfo | null;
  const status = info?.lastBuildStatus ?? BUILD_STATUS.idle;

  useEffect(() => {
    // Only poll while building; success/failed/idle need no refresh loop.
    if (!id || status !== BUILD_STATUS.building) return;
    const timer = setInterval(() => {
      setParams({ depth: 0, t: Date.now() });
    }, BUILDING_POLL_MS);
    return () => clearInterval(timer);
  }, [id, status, setParams]);

  if (!id || !info) return null;

  const meta = STATUS_LABELS[status] ?? STATUS_LABELS[BUILD_STATUS.idle]!;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '12px 16px',
        marginBottom: '20px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-elevation-50)',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '13px' }}>Build</span>
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          color: meta.color,
          backgroundColor: meta.bg,
        }}
      >
        {meta.label}
      </span>
      {status === BUILD_STATUS.building && (
        <span style={{ fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
          mise à jour automatique…
        </span>
      )}
      {status === BUILD_STATUS.success && info.spaUrl && (
        <a
          href={info.spaUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '13px' }}
        >
          Ouvrir la présentation web ↗
        </a>
      )}
      {status === BUILD_STATUS.failed && info.lastBuildError && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--theme-error-500)',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={info.lastBuildError}
        >
          {info.lastBuildError.split('\n')[0]}
        </span>
      )}
    </div>
  );
};

export default BuildStatusField;
