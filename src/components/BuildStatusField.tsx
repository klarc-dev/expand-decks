'use client';

import React, { useEffect } from 'react';
import { Pill, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { AdminNotice } from '@/components/adminUi/AdminSurface';
import { BUILD_STATUS, type BuildStatus } from '@/lib/status';

import './BuildStatusField.scss';

type BuildInfo = {
  createdAt?: string | null;
  updatedAt?: string | null;
  lastBuildStatus?: BuildStatus | null;
  lastBuildError?: string | null;
  lastBuildRequestedAt?: string | null;
};

type BuildStatusPillStyle = 'error' | 'light-gray' | 'success' | 'warning';

const STATUS_LABELS: Record<string, { label: string; pillStyle: BuildStatusPillStyle }> = {
  [BUILD_STATUS.idle]: { label: 'Non disponibles', pillStyle: 'light-gray' },
  [BUILD_STATUS.building]: { label: 'Préparation…', pillStyle: 'warning' },
  [BUILD_STATUS.success]: { label: 'Disponibles', pillStyle: 'success' },
  [BUILD_STATUS.failed]: { label: 'À relancer', pillStyle: 'error' },
};

const BUILDING_POLL_MS = 2000;
const RECENT_REQUEST_MS = 90_000;

function BuildErrorNotice({ error }: { error: string }) {
  const summary = error.split('\n')[0];
  return (
    <AdminNotice className="build-status__error" variant="error">
      <span>{summary}</span>
      {error !== summary ? (
        <details className="build-status__error-details">
          <summary>Afficher le détail technique</summary>
          <pre>{error}</pre>
        </details>
      ) : null}
    </AdminNotice>
  );
}

const BuildStatusField: React.FC = () => {
  const { id } = useDocumentInfo();
  const [{ data }, { setParams }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    initialParams: { depth: 0 },
  });
  const info = (data ?? null) as BuildInfo | null;
  const status = info?.lastBuildStatus ?? BUILD_STATUS.idle;
  const requestedAtMs = info?.lastBuildRequestedAt
    ? Date.parse(info.lastBuildRequestedAt)
    : Number.NaN;
  const requestIsRecent =
    !Number.isNaN(requestedAtMs) && Date.now() - requestedAtMs < RECENT_REQUEST_MS;
  const shouldPoll = status === BUILD_STATUS.building || requestIsRecent;

  useEffect(() => {
    if (!id || !shouldPoll) return;
    const timer = setInterval(() => setParams({ depth: 0, t: Date.now() }), BUILDING_POLL_MS);
    return () => clearInterval(timer);
  }, [id, shouldPoll, setParams]);

  useEffect(() => {
    if (!id) return;
    const refresh = () => setParams({ depth: 0, t: Date.now() });
    window.addEventListener('presentation-build-requested', refresh);
    return () => window.removeEventListener('presentation-build-requested', refresh);
  }, [id, setParams]);

  if (!id || !info) return null;

  const meta = STATUS_LABELS[status] ?? STATUS_LABELS[BUILD_STATUS.idle]!;
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const formatDate = (value?: string | null) =>
    value ? dateFormatter.format(new Date(value)) : null;
  const updatedAt = formatDate(info.updatedAt);
  const createdAt = formatDate(info.createdAt);

  return (
    <div className="build-status">
      <span className="build-status__item">
        <span className="build-status__label">Aperçu et PDF</span>
        <span aria-atomic="true" aria-live="polite" role="status">
          <span className="sr-only">Disponibilité de l’aperçu et du PDF : </span>
          <Pill pillStyle={meta.pillStyle} rounded size="small">
            {meta.label}
          </Pill>
        </span>
      </span>
      {updatedAt ? (
        <span className="build-status__item">
          <span className="build-status__label">Modifiée le</span>
          <span>{updatedAt}</span>
        </span>
      ) : null}
      {createdAt ? (
        <span className="build-status__item">
          <span className="build-status__label">Créée le</span>
          <span>{createdAt}</span>
        </span>
      ) : null}
      {status === BUILD_STATUS.failed && info.lastBuildError ? (
        <BuildErrorNotice error={info.lastBuildError} />
      ) : null}
    </div>
  );
};

export default BuildStatusField;
