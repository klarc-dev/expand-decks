'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Download, EllipsisVertical, ExternalLink, Save, type LucideIcon } from 'lucide-react';
import { PopupList, toast, useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { artifactLinkKey, availableArtifactLinks } from '@/documents/artifacts';
import { adminPost } from '@/lib/adminFetch';
import { BUILD_STATUS } from '@/lib/status';

const DOWNLOAD_REFRESH_MS = 2000;
const ACTION_ICON_SIZE = 20;
const ACTION_ICON_STROKE = 1.75;

type DownloadDocument = {
  artifacts?: unknown;
  lastBuildStatus?: string | null;
  lastBuildToken?: unknown;
};

type PresentationActionIconProps = {
  icon: LucideIcon;
};

const PresentationActionIcon: React.FC<PresentationActionIconProps> = ({ icon: Icon }) => (
  <Icon
    aria-hidden="true"
    className="presentation-action-icon"
    size={ACTION_ICON_SIZE}
    strokeWidth={ACTION_ICON_STROKE}
  />
);

function mountPresentationActionIcon(
  target: HTMLElement | null | undefined,
  icon: LucideIcon,
): () => void {
  if (!target) return () => undefined;

  const host = document.createElement('span');
  host.className = 'presentation-action-icon-host';
  host.setAttribute('aria-hidden', 'true');
  target.append(host);

  const root: Root = createRoot(host);
  root.render(<PresentationActionIcon icon={icon} />);

  return () => {
    root.unmount();
    host.remove();
  };
}

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

  // Same element and class as Payload's own preview control beside it, so the
  // two read as one row of document actions; `download` saves instead of opening.
  return (
    <a
      aria-label="Télécharger le PDF"
      className="preview-btn"
      download
      href={pdf.href}
      title="Télécharger le PDF"
    >
      <PresentationActionIcon icon={Download} />
    </a>
  );
};

/**
 * Structural marker for the controls row. Payload renders before-document
 * controls inside `.doc-controls__controls`; this lets scoped CSS give the
 * row an accessible group label without replacing Payload's native controls.
 */
export const PresentationActionGroupStart: React.FC = () => {
  useEffect(() => {
    const controls = document.querySelector<HTMLElement>(
      '.collection-edit--presentations .doc-controls__controls',
    );
    if (!controls) return;

    const previousRole = controls.getAttribute('role');
    const previousLabel = controls.getAttribute('aria-label');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Actions de la présentation');

    const iconCleanups = new Map<HTMLElement, () => void>();
    const attributeCleanups = new Map<HTMLElement, Map<string, () => void>>();

    const setTemporaryAttribute = (
      element: HTMLElement | null | undefined,
      name: string,
      value: string,
    ) => {
      if (!element) return;
      const elementCleanups = attributeCleanups.get(element) ?? new Map<string, () => void>();
      if (elementCleanups.has(name)) return;
      const previousValue = element.getAttribute(name);
      element.setAttribute(name, value);
      elementCleanups.set(name, () => {
        if (previousValue === null) element.removeAttribute(name);
        else element.setAttribute(name, previousValue);
      });
      attributeCleanups.set(element, elementCleanups);
    };

    const mountIconOnce = (element: HTMLElement | null | undefined, icon: LucideIcon) => {
      if (!element || iconCleanups.has(element)) return;
      iconCleanups.set(element, mountPresentationActionIcon(element, icon));
    };

    const syncActions = () => {
      const saveButton = controls.querySelector<HTMLElement>('#action-save');
      const previewButton = controls.querySelector<HTMLElement>('.preview-btn:not([download])');
      const menuButton = controls.parentElement?.querySelector<HTMLElement>(
        '.doc-controls__popup .popup-button',
      );

      setTemporaryAttribute(saveButton, 'title', 'Sauvegarder');
      setTemporaryAttribute(menuButton, 'aria-label', "Plus d'actions");
      setTemporaryAttribute(menuButton, 'title', "Plus d'actions");
      mountIconOnce(previewButton, ExternalLink);
      mountIconOnce(saveButton, Save);
      mountIconOnce(menuButton, EllipsisVertical);
    };

    syncActions();
    const observer = new MutationObserver(syncActions);
    observer.observe(controls.parentElement ?? controls, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const unmountIcon of iconCleanups.values()) unmountIcon();
      for (const elementCleanups of attributeCleanups.values()) {
        for (const restoreAttribute of elementCleanups.values()) restoreAttribute();
      }
      if (previousRole === null) controls.removeAttribute('role');
      else controls.setAttribute('role', previousRole);
      if (previousLabel === null) controls.removeAttribute('aria-label');
      else controls.setAttribute('aria-label', previousLabel);
    };
  }, []);

  return null;
};

function downloadFile(href: string) {
  const link = document.createElement('a');
  link.download = '';
  link.href = href;
  link.rel = 'noopener noreferrer';
  document.body.append(link);
  link.click();
  link.remove();
}

/** Native Payload menu for the two author-facing presentation outputs. */
const ExportMenuItem: React.FC = () => {
  const { data: documentData, id } = useDocumentInfo();
  const [loading, setLoading] = useState(false);
  const artifacts = availableArtifactLinks(documentData ?? {});
  const pdf = artifacts.find((artifact) => artifact.key === 'pdf');
  const preview = artifacts.find((artifact) => artifact.key === 'spa');

  const handleRefreshOutputs = useCallback(async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const { ok, status, data } = await adminPost(`/api/presentations/${id}/build`);
      if (!ok) {
        toast.error(data?.error || `Impossible de préparer l’aperçu et le PDF (HTTP ${status})`);
        return;
      }
      toast.success('Préparation de l’aperçu et du PDF lancée.');
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
      {preview ? (
        <PopupList.Button
          key={artifactLinkKey(preview)}
          onClick={() => window.open(preview.href, '_blank', 'noopener,noreferrer')}
        >
          Ouvrir l’aperçu
        </PopupList.Button>
      ) : null}
      {pdf ? (
        <PopupList.Button key={artifactLinkKey(pdf)} onClick={() => downloadFile(pdf.href)}>
          Télécharger le PDF
        </PopupList.Button>
      ) : null}
      <PopupList.Button onClick={handleRefreshOutputs} disabled={loading}>
        {loading ? 'Préparation en cours…' : 'Mettre à jour l’aperçu et le PDF'}
      </PopupList.Button>
    </PopupList.ButtonGroup>
  );
};

export default ExportMenuItem;
