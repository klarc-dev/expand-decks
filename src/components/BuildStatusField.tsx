'use client';

import React, { useEffect } from 'react';
import { Pill, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { AdminNotice, AdminPanel } from '@/components/adminUi/AdminSurface';
import { BUILD_STATUS, type BuildStatus } from '@/lib/status';

import './BuildStatusField.scss';

type BuildInfo = {
  lastBuildStatus?: BuildStatus | null;
  lastBuildError?: string | null;
  lastBuildRequestedAt?: string | null;
};

type BuildStatusPillStyle = 'error' | 'light-gray' | 'success' | 'warning';

const STATUS_LABELS: Record<string, { label: string; pillStyle: BuildStatusPillStyle }> = {
  [BUILD_STATUS.idle]: { label: 'En attente', pillStyle: 'light-gray' },
  [BUILD_STATUS.building]: { label: 'En cours…', pillStyle: 'warning' },
  [BUILD_STATUS.success]: { label: 'Réussi', pillStyle: 'success' },
  [BUILD_STATUS.failed]: { label: 'Échoué', pillStyle: 'error' },
};

const BUILDING_POLL_MS = 2000;
const RECENT_REQUEST_MS = 90_000;

function formatRequestedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toLocaleString('fr-FR');
}

function BuildMetadata({
  requestedAt,
  requestedAtLabel,
}: {
  requestedAt?: string | null;
  requestedAtLabel: string | null;
}) {
  if (!requestedAtLabel || !requestedAt) return null;
  return (
    <dl aria-label="Informations du build" className="build-status__metadata">
      <div>
        <dt>Demandé</dt>
        <dd>
          <time dateTime={requestedAt}>{requestedAtLabel}</time>
        </dd>
      </div>
    </dl>
  );
}

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
  return (
    <AdminPanel className="build-status">
      <span className="build-status__label">Build</span>
      <span aria-atomic="true" aria-live="polite" role="status">
        <span className="sr-only">Statut du build : </span>
        <Pill pillStyle={meta.pillStyle} rounded size="small">
          {meta.label}
        </Pill>
      </span>
      <BuildMetadata
        requestedAt={info.lastBuildRequestedAt}
        requestedAtLabel={formatRequestedAt(info.lastBuildRequestedAt)}
      />
      {status === BUILD_STATUS.failed && info.lastBuildError ? (
        <BuildErrorNotice error={info.lastBuildError} />
      ) : null}
    </AdminPanel>
  );
};

export default BuildStatusField;
