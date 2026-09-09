'use client';

import React, { useCallback, useState } from 'react';
import { PopupList, toast, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import {
  artifactLinkKey,
  availableArtifactLinks,
  type DocumentArtifact,
} from '@/documents/artifacts';
import { adminPost } from '@/lib/adminFetch';

/** Native Payload menu for available template artifacts and rebuild requests. */
const ExportMenuItem: React.FC = () => {
  const { id } = useDocumentInfo();
  const [loading, setLoading] = useState(false);
  const [{ data }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    initialParams: { depth: 1 },
  });
  const artifacts = availableArtifactLinks(
    (data ?? {}) as { artifacts?: DocumentArtifact[]; lastBuildToken?: string },
  );

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
      {artifacts.map((artifact) => (
        <PopupList.Button
          key={artifactLinkKey(artifact)}
          onClick={() => window.open(artifact.href, '_blank', 'noopener,noreferrer')}
        >
          {artifact.label}
        </PopupList.Button>
      ))}
      <PopupList.Button onClick={handleExport} disabled={loading}>
        {loading ? 'Export en cours…' : 'Exporter'}
      </PopupList.Button>
    </PopupList.ButtonGroup>
  );
};

export default ExportMenuItem;
