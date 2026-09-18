'use client';
// fallow-ignore-file unused-file -- referenced by Payload's generated admin import map

import React, { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Copy,
  Download,
  EllipsisVertical,
  ExternalLink,
  Save,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useDocumentInfo, usePayloadAPI } from '@payloadcms/ui';

import { availableArtifactLinks } from '@/documents/artifacts';
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
    const directActionCleanups = new Map<HTMLElement, () => void>();

    const setTemporaryAttribute = (
      element: HTMLElement | null | undefined,
      name: string,
      value: string | null,
    ) => {
      if (!element) return;
      const elementCleanups = attributeCleanups.get(element) ?? new Map<string, () => void>();
      if (!elementCleanups.has(name)) {
        const previousValue = element.getAttribute(name);
        elementCleanups.set(name, () => {
          if (previousValue === null) element.removeAttribute(name);
          else element.setAttribute(name, previousValue);
        });
        attributeCleanups.set(element, elementCleanups);
      }
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    };

    const mountIconOnce = (element: HTMLElement | null | undefined, icon: LucideIcon) => {
      if (!element || iconCleanups.has(element)) return;
      iconCleanups.set(element, mountPresentationActionIcon(element, icon));
    };

    const addDirectAction = (
      element: HTMLElement | null | undefined,
      label: string,
      icon: LucideIcon,
    ) => {
      if (!element || directActionCleanups.has(element)) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'presentation-direct-action';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      const unmountIcon = mountPresentationActionIcon(button, icon);
      const invokeNativeAction = () => element.click();
      button.addEventListener('click', invokeNativeAction);
      controls.append(button);

      directActionCleanups.set(element, () => {
        button.removeEventListener('click', invokeNativeAction);
        unmountIcon();
        button.remove();
      });
    };

    const syncActions = () => {
      const saveButton = controls.querySelector<HTMLElement>('#action-save');
      const previewButton = controls.querySelector<HTMLElement>('.preview-btn:not([download])');
      const menuButton = controls.parentElement?.querySelector<HTMLElement>(
        '.doc-controls__popup .popup-button',
      );
      const menu = menuButton?.closest<HTMLElement>('.doc-controls__popup');
      const duplicateButton = document.querySelector<HTMLElement>('#action-duplicate');
      const deleteButton = document.querySelector<HTMLElement>('#action-delete');
      const createPresentationLink = document.querySelector<HTMLElement>(
        'a[href="/admin/collections/presentations/create"]',
      );

      setTemporaryAttribute(saveButton, 'title', 'Sauvegarder');
      setTemporaryAttribute(menuButton, 'aria-label', "Plus d'actions");
      setTemporaryAttribute(menuButton, 'title', "Plus d'actions");
      setTemporaryAttribute(createPresentationLink, 'hidden', '');
      mountIconOnce(previewButton, ExternalLink);
      mountIconOnce(saveButton, Save);
      addDirectAction(duplicateButton, 'Dupliquer', Copy);
      addDirectAction(deleteButton, 'Supprimer', Trash2);

      const documentActionList = createPresentationLink?.closest<HTMLElement>('.popup-button-list');
      const menuActions =
        documentActionList?.querySelectorAll<HTMLElement>('[role="menuitem"], button, a[href]') ??
        [];
      const hasRemainingMenuActions = Array.from(menuActions).some(
        (action) =>
          !['action-create', 'action-duplicate', 'action-delete'].includes(action.id) &&
          !action.hidden,
      );

      if (hasRemainingMenuActions) {
        setTemporaryAttribute(menu, 'hidden', null);
        setTemporaryAttribute(menuButton, 'aria-label', "Plus d'actions");
        setTemporaryAttribute(menuButton, 'title', "Plus d'actions");
        mountIconOnce(menuButton, EllipsisVertical);
      } else {
        setTemporaryAttribute(menu, 'hidden', '');
      }
    };

    syncActions();
    const observer = new MutationObserver(syncActions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const removeDirectAction of directActionCleanups.values()) removeDirectAction();
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
