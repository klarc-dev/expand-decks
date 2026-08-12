'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { primaryButtonStyle } from '@/components/adminUi/styles';
import { adminPost } from '@/lib/adminFetch';
import { BUILD_STATUS, type BuildStatus } from '@/lib/status';

const BUILDING_POLL_MS = 2000;

/**
 * Export button rendered beside Save (via admin.components.edit
 * .beforeDocumentControls). Triggers the existing `/:id/build` endpoint, which
 * rebuilds the deck from the current content and always produces PDF, SPA and
 * cover artifacts. Polls `lastBuildStatus` so the label tracks the build.
 */
const ExportButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const [starting, setStarting] = useState(false);
  const wasBuilding = useRef(false);

  // Native document read; refetched on a short interval only while building.
  const [{ data }, { setParams }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    initialParams: { depth: 0 },
  });
  const status = ((data?.lastBuildStatus as BuildStatus | undefined) ??
    BUILD_STATUS.idle) as BuildStatus;
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
      } = await adminPost(`/api/presentations/${id}/build`);
      if (!ok) {
        toast.error(res?.error || `Échec du démarrage (HTTP ${httpStatus})`);
        return;
      }
      toast.success('Export lancé…');
      // Kick the poller immediately so the label flips to "en cours".
      setParams({ depth: 0, t: Date.now() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setStarting(false);
    }
  }, [id, building, setParams]);

  // No id yet (new, unsaved doc) — nothing to export.
  if (!id) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
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
