'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  DocumentIcon,
  PopupList,
  toast,
  useDocumentInfo,
  usePayloadAPI,
} from '@payloadcms/ui';

import { artifactLinkKey, availableArtifactLinks } from '@/documents/artifacts';
import { adminPost } from '@/lib/adminFetch';
import { BUILD_STATUS } from '@/lib/status';

const DOWNLOAD_REFRESH_MS = 2000;

type DownloadDocument = {
  artifacts?: unknown;
  lastBuildStatus?: string | null;
  lastBuildToken?: unknown;
};

export const DownloadPdfButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const [{ data }, { setParams }] = usePayloadAPI(id ? `/api/presentations/${id}` : '', {
    // depth 1 populates the artifact file: at depth 0 it is a bare id with no
    // url, so no link can be built and the button never renders.
    initialParams: { depth: 1 },
  });
  const document = (data ?? null) as DownloadDocument | null;
  const pdf =
    document?.lastBuildStatus === BUILD_STATUS.success
      ? availableArtifactLinks(document).find((artifact) => artifact.key === 'pdf')
      : undefined;

  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => setParams({ depth: 1, t: Date.now() }), DOWNLOAD_REFRESH_MS);
    return () => clearInterval(timer);
  }, [id, setParams]);

  useEffect(() => {
    if (!id) return;
    const refresh = () => setParams({ depth: 1, t: Date.now() });
    window.addEventListener('presentation-build-requested', refresh);
    return () => window.removeEventListener('presentation-build-requested', refresh);
  }, [id, setParams]);

  if (!id || !pdf) return null;

  return (
    <Button
      aria-label="Télécharger le PDF"
      buttonStyle="transparent"
      el="anchor"
      extraButtonProps={{ download: true }}
      margin={false}
      round
      size="small"
      tooltip="Télécharger le PDF"
      url={pdf.href}
      icon={<DocumentIcon />}
    />
  );
};

/** Native Payload menu for available template artifacts and rebuild requests. */
const ExportMenuItem: React.FC = () => {
  const { data: documentData, id } = useDocumentInfo();
  const [loading, setLoading] = useState(false);
  const artifacts = availableArtifactLinks(documentData ?? {});

  const handleExport = useCallback(async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const { ok, status, data } = await adminPost(`/api/presentations/${id}/build`);
      if (!ok) {
        toast.error(data?.error || `Échec du démarrage (HTTP ${status})`);
        return;
      }
      toast.success('Export lancé. Le statut est visible au-dessus du contenu.');
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
