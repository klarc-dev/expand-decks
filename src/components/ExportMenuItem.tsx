'use client';

import React, { useCallback, useState } from 'react';
import { PopupList, toast, useDocumentInfo } from '@payloadcms/ui';

import { adminPost } from '@/lib/adminFetch';

/** Native Payload three-dot menu action for a complete SPA, PDF and cover export. */
const ExportMenuItem: React.FC = () => {
  const { id } = useDocumentInfo();
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const { ok, status, data } = await adminPost(`/api/presentations/${id}/build`);
      if (!ok) {
        toast.error(data?.error || `Échec du démarrage (HTTP ${status})`);
        return;
      }

      toast.success('Export lancé. Le statut est visible dans l’onglet Sortie.');
      window.dispatchEvent(new CustomEvent('presentation-build-requested'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [id, loading]);

  if (!id) return null;

  return (
    <PopupList.ButtonGroup>
      <PopupList.Button onClick={handleExport} disabled={loading}>
        {loading ? 'Export en cours…' : 'Exporter'}
      </PopupList.Button>
    </PopupList.ButtonGroup>
  );
};

export default ExportMenuItem;
