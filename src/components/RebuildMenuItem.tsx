'use client';

import React, { useCallback, useState } from 'react';
import { PopupList, toast, useDocumentInfo } from '@payloadcms/ui';

import { adminPost } from '@/lib/adminFetch';

/**
 * Native Payload editMenuItems action for the Presentations collection.
 *
 * Appears in the three-dot (•••) dropdown next to Save.
 * Calls the existing POST /api/presentations/:id/build endpoint.
 * Build status is tracked separately by BuildStatusField (Sortie tab) — no
 * polling duplication here.
 */
const RebuildMenuItem: React.FC = () => {
  const { id } = useDocumentInfo();
  const [loading, setLoading] = useState(false);

  const handleRebuild = useCallback(async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const { ok, status: httpStatus, data } = await adminPost(`/api/presentations/${id}/build`);
      if (!ok) {
        toast.error(data?.error || `Échec du démarrage (HTTP ${httpStatus})`);
      } else {
        toast.success('Rebuild demandé — statut visible dans l’onglet Sortie.');
        window.dispatchEvent(new CustomEvent('presentation-build-requested'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [id, loading]);

  if (!id) return null;

  return (
    <PopupList.ButtonGroup>
      <PopupList.Button onClick={handleRebuild} disabled={loading}>
        {loading ? 'Rebuild…' : 'Rebuild'}
      </PopupList.Button>
    </PopupList.ButtonGroup>
  );
};

export default RebuildMenuItem;
