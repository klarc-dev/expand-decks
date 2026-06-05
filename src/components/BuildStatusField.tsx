'use client';

import React, { useEffect, useState } from 'react';
import { useDocumentInfo } from '@payloadcms/ui';

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

const POLL_MS = 5000;

/**
 * Live build status — polls the document so authors see
 * En attente → En cours → Réussi/Échoué without reloading the page.
 */
const BuildStatusField: React.FC = () => {
  const { id } = useDocumentInfo();
  const [info, setInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/presentations/${id}?depth=0`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const doc = (await res.json()) as BuildInfo;
        if (active) setInfo(doc);
      } catch {
        // transient network errors — keep the last known state
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  if (!id || !info) return null;

  const status = info.lastBuildStatus ?? BUILD_STATUS.idle;
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
          mise à jour automatique toutes les 5 s
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
