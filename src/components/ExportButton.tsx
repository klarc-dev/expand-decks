'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { primaryButtonStyle } from '@/components/adminUi/styles';
import { adminPost } from '@/lib/adminFetch';
import { OUTPUT_POLICIES, type OutputPolicy } from '@/lib/outputPolicy';
import { BUILD_STATUS, type BuildStatus } from '@/lib/status';

const BUILDING_POLL_MS = 2000;

const POLICY_LABELS: Record<OutputPolicy, string> = {
  both: 'PDF + SPA',
  pdf: 'PDF seul',
  spa: 'SPA seul',
};

/**
 * Export button rendered beside Save (via admin.components.edit
 * .beforeDocumentControls). Triggers the existing `/:id/build` endpoint, which
 * rebuilds the deck from the current content and produces artifacts controlled
 * by the selected outputPolicy. A new media record replaces `pdfFile` every
 * PDF run, so the export is always clean (no stale PDF). Polls
 * `lastBuildStatus` so the label tracks the build.
 */
const ExportButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const [starting, setStarting] = useState(false);
  const [policy, setPolicy] = useState<OutputPolicy>('both');
  const wasBuilding = useRef(false);

  // Native document read; refetched on a short interval only while building.
  const [{ data }, { setParams }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    initialParams: { depth: 0 },
  });
  const status = ((data?.lastBuildStatus as BuildStatus | undefined) ??
    BUILD_STATUS.idle) as BuildStatus;
  const spaUrl = typeof data?.spaUrl === 'string' ? data.spaUrl : '';
  const building = status === BUILD_STATUS.building || starting;

  useEffect(() => {
    if (!id || status !== BUILD_STATUS.building) return;
    wasBuilding.current = true;
    const timer = setInterval(() => setParams({ depth: 0, t: Date.now() }), BUILDING_POLL_MS);
    return () => clearInterval(timer);
  }, [id, status, setParams]);

  // Toast once when a build we were watching reaches a terminal state.
  useEffect(() => {
    if (!wasBuilding.current) return;
    if (status === BUILD_STATUS.success) {
      wasBuilding.current = false;
      toast.success('Export terminé.');
    } else if (status === BUILD_STATUS.failed) {
      wasBuilding.current = false;
      toast.error("L'export a échoué. Voir « Sortie » pour le détail.");
    }
  }, [status]);

  const handleExport = useCallback(async () => {
    if (!id || building) return;
    setStarting(true);
    try {
      const {
        ok,
        status: httpStatus,
        data: res,
      } = await adminPost(`/api/presentations/${id}/build`, { outputPolicy: policy });
      if (!ok) {
        toast.error(res?.error || `Échec du démarrage (HTTP ${httpStatus})`);
        return;
      }
      toast.success(`Export lancé (${POLICY_LABELS[policy]})…`);
      // Kick the poller immediately so the label flips to "en cours".
      setParams({ depth: 0, t: Date.now() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setStarting(false);
    }
  }, [id, building, policy, setParams]);

  // No id yet (new, unsaved doc) — nothing to export.
  if (!id) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: '4px' }}>
      <a
        href={spaUrl || undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!spaUrl}
        onClick={(event) => {
          if (!spaUrl) event.preventDefault();
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 14px',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-elevation-50)',
          color: spaUrl ? 'var(--theme-text)' : 'var(--theme-elevation-400)',
          cursor: spaUrl ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
        title={
          spaUrl
            ? 'Ouvrir la dernière version web construite dans un nouvel onglet'
            : 'La prévisualisation sera disponible après le premier export SPA'
        }
      >
        Prévisualiser ↗
      </a>
      <select
        value={policy}
        onChange={(e) => setPolicy(e.target.value as OutputPolicy)}
        disabled={building}
        style={{
          fontSize: '12px',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: '4px',
          padding: '0 6px',
          backgroundColor: 'var(--theme-elevation-50)',
          cursor: building ? 'not-allowed' : 'pointer',
        }}
        title="Artefacts à produire"
        aria-label="Politique de sortie"
      >
        {OUTPUT_POLICIES.map((p) => (
          <option key={p} value={p}>
            {POLICY_LABELS[p]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleExport}
        disabled={building}
        style={{
          ...primaryButtonStyle(building),
          padding: '0 18px',
          height: '100%',
          cursor: building ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          whiteSpace: 'nowrap',
        }}
        title="Reconstruit la présentation à partir du contenu actuel"
      >
        {building ? 'Export en cours…' : 'Exporter'}
      </button>
    </div>
  );
};

export default ExportButton;
